import { withPagePerf } from "@/lib/perf";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/actions/admin";
import { Pencil } from "lucide-react";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { ExpenseBuilderForm } from "@/components/forms/expense-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { getExpenseOverviewPage, getPurchaseInvoiceBuilderOptions } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateInputValue } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

const categoryLabels = {
  sq: {
    FUEL: "Karburant",
    FOOD: "Ushqim",
    TRANSPORT: "Transport",
    MAINTENANCE: "Mirëmbajtje",
    OFFICE: "Zyrë",
    OTHER: "Tjetër",
  },
  en: {
    FUEL: "Fuel",
    FOOD: "Food",
    TRANSPORT: "Transport",
    MAINTENANCE: "Maintenance",
    OFFICE: "Office",
    OTHER: "Other",
  },
} as const;

const categories = [
  "FUEL",
  "FOOD",
  "TRANSPORT",
  "MAINTENANCE",
  "OFFICE",
  "OTHER",
] as const;

function today() {
  return formatDateInputValue();
}

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function ExpenseFields({
  locale,
  defaults,
}: {
  locale: Locale;
  defaults?: {
    name: string;
    category: (typeof categories)[number];
    amountCents: number;
    vatEnabled: boolean;
    vatRate: number;
    date: Date;
    supplierName: string | null;
    description: string | null;
  };
}) {
  return (
    <>
      <input
        name="name"
        defaultValue={defaults?.name ?? ""}
        className={inputClassName}
        placeholder={locale === "sq" ? "Emri i shpenzimit" : "Expense name"}
        required
      />
      <input
        name="supplierName"
        defaultValue={defaults?.supplierName ?? ""}
        className={inputClassName}
        placeholder={locale === "sq" ? "Furnitori" : "Supplier"}
      />
      <input
        name="date"
        type="date"
        defaultValue={defaults ? formatDateInputValue(defaults.date) : today()}
        className={inputClassName}
        required
      />
      <input
        name="amount"
        type="number"
        min="0"
        step="0.01"
        defaultValue={defaults ? (defaults.amountCents / 100).toFixed(2) : ""}
        className={inputClassName}
        placeholder={locale === "sq" ? "Shuma" : "Amount"}
        required
      />
      <select
        name="category"
        defaultValue={defaults?.category ?? "FUEL"}
        className={inputClassName}
        required
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {categoryLabels[locale][category]}
          </option>
        ))}
      </select>
      <input
        name="vatRate"
        type="number"
        min="0"
        step="0.01"
        defaultValue={defaults?.vatRate ?? 18}
        className={inputClassName}
        placeholder={locale === "sq" ? "TVSH %" : "VAT %"}
      />
      <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
        <input
          type="checkbox"
          name="vatEnabled"
          defaultChecked={defaults?.vatEnabled ?? true}
          className="h-4 w-4"
        />
        {locale === "sq" ? "Apliko TVSH" : "Apply VAT"}
      </label>
      <textarea
        name="description"
        defaultValue={defaults?.description ?? ""}
        className={`${inputClassName} md:col-span-full`}
        placeholder={locale === "sq" ? "Përshkrimi" : "Description"}
      />
    </>
  );
}

async function ExpensesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/expenses">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "EXPENSES", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "date";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const [expenses, options] = await Promise.all([
    getExpenseOverviewPage({
      page: parsePage(resolvedSearchParams.page),
      query,
      sort,
      direction,
    }),
    getPurchaseInvoiceBuilderOptions(typedLocale),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "EXPENSES", "CREATE");
  const canEdit = can(permissions, "EXPENSES", "EDIT");
  const canDelete = can(permissions, "EXPENSES", "DELETE");

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Krijo shpenzim" : "Create expense"}
          buttonLabel={typedLocale === "sq" ? "Shto shpenzim" : "Add expense"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <ExpenseBuilderForm
            locale={typedLocale}
            suppliers={options.suppliers.map((supplier) => ({
              id: supplier.id,
              name: supplier.name,
            }))}
            items={options.items.map((item) => ({
              id: item.id,
              name: item.name,
              sku: item.sku,
              unit: item.unit,
              unitPriceCents: item.unitPriceCents,
              categoryTitle: item.categoryTitle,
            }))}
            action={createExpenseAction.bind(null, typedLocale)}
          />
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/expenses`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kërko shpenzime, kategori ose furnitorë"
              : "Search expenses, categories, or suppliers"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka shpenzime për këtë kërkim."
              : "No expenses match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          serverControlled
          pagination={{
            page: expenses.page,
            totalPages: expenses.totalPages,
            totalItems: expenses.totalItems,
            pageSize: expenses.pageSize,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} shpenzime"
                : "Page {page} of {totalPages} - {totalItems} expenses",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Shpenzimi" : "Expense", sortable: true },
            { key: "supplier", label: typedLocale === "sq" ? "Furnitori" : "Supplier", sortable: true },
            { key: "category", label: typedLocale === "sq" ? "Kategoria" : "Category", sortable: true },
            { key: "date", label: typedLocale === "sq" ? "Data" : "Date", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali / TVSH" : "Total / VAT", sortable: true, align: "right" },
            { key: "description", label: typedLocale === "sq" ? "Përshkrimi" : "Description" },
          ]}
          rows={expenses.items.map((expense) => ({
            id: expense.id,
            searchText: `${expense.name} ${categoryLabels[typedLocale][expense.category]} ${expense.supplierName ?? ""} ${expense.description ?? ""}`,
            sortValues: {
              name: expense.name,
              category: categoryLabels[typedLocale][expense.category],
              total: expense.totalCents,
              date: expense.date,
              supplier: expense.supplierName ?? "",
            },
            cells: {
              name: (
                <div>
                  <p className="font-semibold">{expense.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {formatDate(expense.date, localeString)}
                  </p>
                </div>
              ),
              supplier: expense.supplierName || "-",
              category: (
                <Badge tone="accent">
                  {categoryLabels[typedLocale][expense.category]}
                </Badge>
              ),
              date: formatDate(expense.date, localeString),
              total: (
                <div className="space-y-1">
                  <p className="font-semibold">{formatCurrency(expense.totalCents, localeString)}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {typedLocale === "sq" ? "Baza" : "Base"}:{" "}
                    {formatCurrency(expense.amountCents, localeString)}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {typedLocale === "sq" ? "TVSH" : "VAT"}:{" "}
                    {expense.vatEnabled
                      ? `${expense.vatRate}% / ${formatCurrency(expense.vatAmountCents, localeString)}`
                      : typedLocale === "sq"
                        ? "Jo"
                        : "No"}
                  </p>
                </div>
              ),
              description: (
                <p className="max-w-[260px] whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                  {expense.description || "-"}
                </p>
              ),
            },
            actions: (
              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                {canEdit ? (
                  <details className="relative text-left">
                    <summary className={buttonClasses({ variant: "secondary", size: "sm", className: "inline-flex cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden" })}>
                      <Pencil className="h-4 w-4" />
                      {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                    </summary>
                    <form
                      action={updateExpenseAction.bind(null, typedLocale, expense.id)}
                      className="absolute right-0 z-20 mt-2 grid w-[min(90vw,560px)] gap-2 rounded-2xl border-[2.25px] border-black/18 bg-[#fbf8f4] p-3 shadow-[0_18px_48px_rgba(18,16,14,0.16)] md:grid-cols-2"
                    >
                      <ExpenseFields locale={typedLocale} defaults={expense} />
                      <div className="md:col-span-2">
                        <button className={buttonClasses({ size: "sm" })}>
                          {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                        </button>
                      </div>
                    </form>
                  </details>
                ) : null}
                {canDelete ? (
                  <form action={deleteExpenseAction.bind(null, typedLocale, expense.id)}>
                    <ConfirmDeleteButton
                      label={typedLocale === "sq" ? "Fshi" : "Delete"}
                      message={
                        typedLocale === "sq"
                          ? `A je i sigurt që dëshiron ta fshish "${expense.name}"?`
                          : `Are you sure you want to delete "${expense.name}"?`
                      }
                    />
                  </form>
                ) : null}
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  );
}

export default withPagePerf("admin/expenses", ExpensesPage);
