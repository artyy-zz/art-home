import { withApiPerf } from "@/lib/perf";
import { getCurrentUser } from "@/lib/auth";
import { getDebitNoteDocumentData } from "@/lib/erp";
import { generateDebitNotePdf } from "@/lib/pdf";
import { userCan } from "@/lib/permissions";

const reasonLabels = {
  ITEM_RETURNED: "Item returned",
  PRICE_CORRECTION: "Price correction",
  DAMAGED_ITEM: "Damaged item",
  ORDER_ADJUSTMENT: "Order adjustment",
  OTHER: "Other",
} as const;

async function GETHandler(
  _request: Request,
  context: RouteContext<"/api/debit-notes/[id]/pdf">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await userCan(user, "DEBIT_NOTES", "EXPORT"))) {
    return new Response("You do not have permission for this action.", { status: 403 });
  }

  const { id } = await context.params;
  const debitNote = await getDebitNoteDocumentData(id);

  if (!debitNote) {
    return new Response("Debit note not found", { status: 404 });
  }

  const pdfBytes = await generateDebitNotePdf({
    title: "Debit Note",
    number: debitNote.number,
    clientName: debitNote.client.name,
    clientAddress: debitNote.client.address,
    clientEmail: debitNote.client.email,
    clientPhone: debitNote.client.phone,
    clientNui: debitNote.client.nui,
    clientVatNumber: debitNote.client.vatNumber,
    invoiceNumber: debitNote.invoice.number,
    reason: reasonLabels[debitNote.reason],
    issuedAt: debitNote.issuedAt,
    notes: debitNote.notes,
    lines: debitNote.items.map((item) => ({
      name: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    subtotalCents: debitNote.subtotalCents,
    vatEnabled: debitNote.vatEnabled,
    vatRate: debitNote.vatRate,
    vatAmountCents: debitNote.vatAmountCents,
    totalCents: debitNote.totalCents,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${debitNote.number}.pdf"`,
    },
  });
}

export const GET = withApiPerf("api/debit-notes/[id]/pdf", GETHandler);
