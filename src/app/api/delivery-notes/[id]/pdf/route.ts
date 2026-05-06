import { getCurrentUser } from "@/lib/auth";
import { getDeliveryNoteDocumentData } from "@/lib/erp";
import { generateDeliveryNotePdf } from "@/lib/pdf";
import { userCan } from "@/lib/permissions";

const typeLabels = {
  SALES: "Sales Delivery Note",
  PURCHASE: "Purchase Delivery Note",
} as const;

export async function GET(
  _request: Request,
  context: RouteContext<"/api/delivery-notes/[id]/pdf">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await userCan(user, "DELIVERY_NOTES", "EXPORT"))) {
    return new Response("You do not have permission for this action.", { status: 403 });
  }

  const { id } = await context.params;
  const deliveryNote = await getDeliveryNoteDocumentData(id);

  if (!deliveryNote) {
    return new Response("Delivery note not found", { status: 404 });
  }

  const isSales = deliveryNote.type === "SALES";
  const party = isSales ? deliveryNote.client : deliveryNote.supplier;

  if (!party) {
    return new Response("Delivery note party not found", { status: 404 });
  }

  const pdfBytes = await generateDeliveryNotePdf({
    title: "Delivery Note",
    number: deliveryNote.number,
    typeLabel: typeLabels[deliveryNote.type],
    partyLabel: isSales ? "Client" : "Supplier",
    partyName: party.name,
    partyEmail: party.email,
    partyPhone: party.phone,
    issuedAt: deliveryNote.issuedAt,
    notes: deliveryNote.notes,
    lines: deliveryNote.items.map((item) => ({
      name: item.productName,
      description: item.description,
      quantity: item.quantity,
    })),
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${deliveryNote.number}.pdf"`,
    },
  });
}
