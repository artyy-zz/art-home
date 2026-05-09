import { withPagePerf } from "@/lib/perf";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  createDebitNoteAction,
  deleteDebitNoteAction,
  updateDebitNoteAction,
} from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { DebitNoteBuilderForm } from "@/components/forms/debit-note-builder-form";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import {
  getAdjustedInvoiceOutstandingCents,
  getDebitNoteBuilderOptions,
  getDebitNoteOverviewPage,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateInputValue } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

const reasonLabels = {
  sq: {
    ITEM_RETURNED: "Artikull i kthyer",
    PRICE_CORRECTION: "Korrigjim çmimi",
    DAMAGED_ITEM: "Artikull i dëmtuar",
    ORDER_ADJUSTMENT: "Rregullim porosie",
    OTHER: "Tjetër",
  },
  en: {
    ITEM_RETURNED: "Item returned",
    PRICE_CORRECTION: "Price correction",
    DAMAGED_ITEM: "Damaged item",
    ORDER_ADJUSTMENT: "Order adjustment",
    OTHER: "Other",
  },
} as const;

const reasons = [
  "ITEM_RETURNED",
  "PRICE_CORRECTION",
  "DAMAGED_ITEM",
  "ORDER_ADJUSTMENT",
  "OTHER",
] as const;

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function DebitNotesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/debit-notes">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "DEBIT_NOTES", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "issuedAt";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const canCreate = can(permissions, "DEBIT_NOTES", "CREATE");
  const [debitNotes, options] = await Promise.all([
    getDebitNoteOverviewPage({
      page: parsePage(resolvedSearchParams.page),
      query,
      sort,
      direction,
    }),
    canCreate
      ? getDebitNoteBuilderOptions()
      : Promise.resolve({ clients: [], invoices: [] }),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canEdit = can(permissions, "DEBIT_NOTES", "EDIT");
  const canDelete = can(permissions, "DEBIT_NOTES", "DELETE");
  const canExport = can(permissions, "DEBIT_NOTES", "EXPORT");
  const canCreateDebitNote =
    canCreate &&
    options.clients.length > 0 &&
    options.invoices.some((invoice) =>
      invoice.items.some((item) => item.remainingQuantity > 0),
    );

  return measureDetailSync(
    "admin/debit-notes.table mapping/formatting",
    () => (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Krijo debit note" : "Create debit note"}
          buttonLabel={typedLocale === "sq" ? "Shto debit note" : "Add debit note"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          {canCreateDebitNote ? (
            <div>
              <DebitNoteBuilderForm
                locale={typedLocale}
                clients={options.clients.map((client) => ({
                  id: client.id,
                  name: client.name,
                }))}
                invoices={options.invoices}
                action={createDebitNoteAction.bind(null, typedLocale)}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5 text-sm leading-7 text-[var(--color-muted)]">
              {typedLocale === "sq"
                ? "Krijoni një faturë shitjeje me artikuj para se të krijoni debit note."
                : "Create a sales invoice with items before creating a debit note."}
            </div>
          )}
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/debit-notes`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kërko debit note, klientë, fatura ose arsye"
              : "Search debit notes, clients, invoices, or reasons"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka debit note për këtë kërkim."
              : "No debit notes match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          serverControlled
          pagination={{
            page: debitNotes.page,
            totalPages: debitNotes.totalPages,
            totalItems: debitNotes.totalItems,
            pageSize: debitNotes.pageSize,
            hasNextPage: debitNotes.hasNextPage,
            hasPreviousPage: debitNotes.hasPreviousPage,
            exactTotal: debitNotes.exactTotal,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} debit note"
                : "Page {page} of {totalPages} - {totalItems} debit notes",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Numri" : "Number", sortable: true },
            { key: "client", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "invoice", label: typedLocale === "sq" ? "Fatura" : "Invoice", sortable: true },
            { key: "reason", label: typedLocale === "sq" ? "Arsyeja" : "Reason", sortable: true },
            { key: "issuedAt", label: typedLocale === "sq" ? "Data" : "Date", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Shuma" : "Amount", sortable: true, align: "right" },
            { key: "adjustedDebt", label: typedLocale === "sq" ? "Borxhi i rregulluar" : "Adjusted debt", sortable: true, align: "right" },
            { key: "description", label: typedLocale === "sq" ? "Përshkrimi" : "Description" },
          ]}
          rows={debitNotes.items.map((note) => {
            const adjustedDebtCents = getAdjustedInvoiceOutstandingCents(note.invoice);

            return {
              id: note.id,
              searchText: `${note.number} ${note.client.name} ${note.invoice.number} ${reasonLabels[typedLocale][note.reason]} ${note.notes ?? ""} ${note.items.map((item) => item.productName).join(" ")}`,
              sortValues: {
                number: note.number,
                client: note.client.name,
                invoice: note.invoice.number,
                reason: reasonLabels[typedLocale][note.reason],
                issuedAt: note.issuedAt,
                total: note.totalCents,
                adjustedDebt: adjustedDebtCents,
              },
              cells: {
                number: (
                  <div>
                    <p className="font-semibold">{note.number}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Korrigjim" : "Adjustment"}
                    </p>
                  </div>
                ),
                client: note.client.name,
                invoice: note.invoice.number,
                reason: reasonLabels[typedLocale][note.reason],
                issuedAt: formatDate(note.issuedAt, localeString),
                total: (
                  <div className="space-y-1">
                    <p className="font-semibold">{formatCurrency(note.totalCents, localeString)}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "TVSH" : "VAT"}:{" "}
                      {formatCurrency(note.vatAmountCents, localeString)}
                    </p>
                  </div>
                ),
                adjustedDebt: formatCurrency(adjustedDebtCents, localeString),
                description: (
                  <div className="max-w-[260px] space-y-1 text-sm text-[var(--color-muted)]">
                    {note.items.map((item) => (
                      <p key={item.id}>
                        {item.productName}: {item.quantity} x{" "}
                        {formatCurrency(item.unitPriceCents, localeString)}
                      </p>
                    ))}
                    {note.notes ? (
                      <p className="whitespace-pre-wrap pt-1">{note.notes}</p>
                    ) : null}
                  </div>
                ),
              },
              actions: (
                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                  {canExport ? (
                    <Link
                      href={`/api/debit-notes/${note.id}/pdf`}
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      PDF
                    </Link>
                  ) : null}
                  {canEdit ? (
                    <details className="relative text-left">
                      <summary className={buttonClasses({ variant: "secondary", size: "sm", className: "inline-flex cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden" })}>
                        <Pencil className="h-4 w-4" />
                        {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                      </summary>
                      <form
                        action={updateDebitNoteAction.bind(null, typedLocale, note.id)}
                        className="absolute right-0 z-20 mt-2 grid w-[min(90vw,340px)] gap-2 rounded-2xl border-[2.25px] border-black/18 bg-[#fbf8f4] p-3 shadow-[0_18px_48px_rgba(18,16,14,0.16)]"
                      >
                        <input
                          name="issuedAt"
                          type="date"
                          defaultValue={formatDateInputValue(note.issuedAt)}
                          className={inputClassName}
                        />
                        <select name="reason" defaultValue={note.reason} className={inputClassName}>
                          {reasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reasonLabels[typedLocale][reason]}
                            </option>
                          ))}
                        </select>
                        <textarea name="notes" defaultValue={note.notes ?? ""} className={inputClassName} />
                        <button className={buttonClasses({ size: "sm" })}>
                          {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                  {canDelete ? (
                    <form action={deleteDebitNoteAction.bind(null, typedLocale, note.id)}>
                      <ConfirmDeleteButton
                        label={typedLocale === "sq" ? "Fshi" : "Delete"}
                        message={
                          typedLocale === "sq"
                            ? `A je i sigurt që dëshiron ta fshish "${note.number}"?`
                            : `Are you sure you want to delete "${note.number}"?`
                        }
                      />
                    </form>
                  ) : null}
                </div>
              ),
            };
          })}
        />
      </Card>
    </div>
    ),
    { locale: typedLocale, rows: debitNotes.items.length },
  );
}

export default withPagePerf("admin/debit-notes", DebitNotesPage);
