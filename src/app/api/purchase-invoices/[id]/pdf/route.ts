import { withApiPerf } from "@/lib/perf";
import { getCurrentUser } from "@/lib/auth";
import { getPurchaseInvoiceDocumentData } from "@/lib/erp";
import { generatePurchasePdf } from "@/lib/pdf";
import { userCan } from "@/lib/permissions";

async function GETHandler(
  _request: Request,
  context: RouteContext<"/api/purchase-invoices/[id]/pdf">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await userCan(user, "PURCHASE_INVOICES", "EXPORT"))) {
    return new Response("You do not have permission for this action.", { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await getPurchaseInvoiceDocumentData(id);

  if (!invoice) {
    return new Response("Purchase invoice not found", { status: 404 });
  }

  const pdfBytes = await generatePurchasePdf({
    title: "Purchase Invoice",
    number: invoice.number,
    supplierName: invoice.supplier.name,
    supplierEmail: invoice.supplier.email,
    supplierPhone: invoice.supplier.phone,
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

export const GET = withApiPerf("api/purchase-invoices/[id]/pdf", GETHandler);
