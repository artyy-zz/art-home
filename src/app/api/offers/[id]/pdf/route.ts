import { generateSalesPdf } from "@/lib/pdf";
import { getOfferDocumentData } from "@/lib/erp";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/offers/[id]/pdf">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await userCan(user, "OFFERS", "EXPORT"))) {
    return new Response("You do not have permission for this action.", { status: 403 });
  }

  const { id } = await context.params;
  const offer = await getOfferDocumentData(id);

  if (!offer) {
    return new Response("Offer not found", { status: 404 });
  }

  const pdfBytes = await generateSalesPdf({
    title: "Offer",
    number: offer.number,
    clientName: offer.client.name,
    clientEmail: offer.client.email,
    clientPhone: offer.client.phone,
    createdAt: offer.createdAt,
    dueDate: offer.validUntil,
    notes: offer.notes,
    lines: offer.items.map((item) => ({
      name: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    subtotalCents: offer.subtotalCents,
    vatEnabled: offer.vatEnabled,
    vatRate: offer.vatRate,
    vatAmountCents: offer.vatAmountCents,
    totalCents: offer.totalCents,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${offer.number}.pdf"`,
    },
  });
}
