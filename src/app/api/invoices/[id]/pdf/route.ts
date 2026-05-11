import { withApiPerf } from "@/lib/perf";
import { generateSalesPdf } from "@/lib/pdf";
import { getInvoiceDocumentData } from "@/lib/erp";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";

async function GETHandler(
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
    title: "Faturë",
    number: invoice.number,
    clientName: invoice.client.name,
    clientAddress: invoice.client.address,
    clientEmail: invoice.client.email,
    clientPhone: invoice.client.phone,
    clientNui: invoice.client.nui,
    clientVatNumber: invoice.client.vatNumber,
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

export const GET = withApiPerf("api/invoices/[id]/pdf", GETHandler);
