import { generateSalesPdf } from "@/lib/pdf";
import { getInvoiceDocumentData } from "@/lib/erp";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/invoices/[id]/pdf">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await userCan(user, "INVOICES", "EXPORT"))) {
    return new Response("You do not have permission for this action.", { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceDocumentData(id);

  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const pdfBytes = await generateSalesPdf({
    title: "Invoice",
    number: invoice.number,
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    clientPhone: invoice.client.phone,
    createdAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    lines: invoice.items.map((item) => ({
      name: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    subtotalCents: invoice.subtotalCents,
    vatEnabled: invoice.vatEnabled,
    vatRate: invoice.vatRate,
    vatAmountCents: invoice.vatAmountCents,
    totalCents: invoice.totalCents,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
