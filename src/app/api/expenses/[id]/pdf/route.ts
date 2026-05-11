import { getCurrentUser } from "@/lib/auth";
import { getExpenseDocumentData } from "@/lib/erp";
import { userCan } from "@/lib/permissions";
import { withApiPerf } from "@/lib/perf";
import { generateExpensePdf } from "@/lib/pdf";

const categoryLabels = {
  FUEL: "Karburant",
  FOOD: "Ushqim",
  TRANSPORT: "Transport",
  MAINTENANCE: "Mirembajtje",
  OFFICE: "Zyre",
  OTHER: "Tjeter",
} as const;

async function GETHandler(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await userCan(user, "EXPENSES", "EXPORT"))) {
    return new Response("You do not have permission for this action.", { status: 403 });
  }

  const { id } = await context.params;
  const expense = await getExpenseDocumentData(id);

  if (!expense) {
    return new Response("Expense not found", { status: 404 });
  }

  const pdfBytes = await generateExpensePdf({
    title: "Shpenzim",
    number: `EXP-${expense.date.getFullYear()}-${expense.id.slice(-6).toUpperCase()}`,
    supplierName: expense.supplierName || "Shpenzim",
    category: categoryLabels[expense.category],
    date: expense.date,
    description: expense.description || expense.name,
    amountCents: expense.amountCents,
    vatEnabled: expense.vatEnabled,
    vatRate: expense.vatRate,
    vatAmountCents: expense.vatAmountCents,
    totalCents: expense.totalCents,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="expense-${expense.id}.pdf"`,
    },
  });
}

export const GET = withApiPerf("api/expenses/[id]/pdf", GETHandler);
