"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateFormPanel } from "@/components/admin/create-form-panel";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { formatCurrency, formatDate, formatDateInputValue } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

type ClientOption = {
  id: string;
  name: string;
};

type InvoiceOption = {
  id: string;
  number: string;
  clientId: string;
  issuedAt: string;
  adjustedOutstandingCents: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    remainingQuantity: number;
    unitPriceCents: number;
  }>;
};

type DebitNoteRow = {
  invoiceItemId: string;
  quantity: string;
  unitPrice: string;
};

const emptyRow: DebitNoteRow = {
  invoiceItemId: "",
  quantity: "1",
  unitPrice: "",
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

function today() {
  return formatDateInputValue();
}

export function DebitNoteBuilderForm({
  locale,
  clients,
  invoices,
  action,
}: {
  locale: Locale;
  clients: ClientOption[];
  invoices: InvoiceOption[];
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const localeString = locale === "sq" ? "sq-AL" : "en-GB";
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [rows, setRows] = useState<DebitNoteRow[]>([{ ...emptyRow }]);

  const clientInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.clientId === selectedClientId),
    [invoices, selectedClientId],
  );
  const selectedInvoice = clientInvoices.find(
    (invoice) => invoice.id === selectedInvoiceId,
  );
  const invoiceItems = selectedInvoice?.items.filter(
    (item) => item.remainingQuantity > 0,
  ) ?? [];
  const subtotalCents = rows.reduce((sum, row) => {
    const quantity = Number(row.quantity || 0);
    const unitPrice = Number(row.unitPrice || 0);
    return sum + Math.round(quantity * unitPrice * 100);
  }, 0);
  const vatCents = vatEnabled ? Math.round(subtotalCents * 0.18) : 0;
  const totalCents = subtotalCents + vatCents;

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setSelectedClientId("");
    setSelectedInvoiceId("");
    setVatEnabled(true);
    setRows([{ ...emptyRow }]);
    closeCreateFormPanel?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <select
          name="clientId"
          value={selectedClientId}
          onChange={(event) => {
            setSelectedClientId(event.target.value);
            setSelectedInvoiceId("");
            setRows([{ ...emptyRow }]);
          }}
          className={inputClassName}
          required
        >
          <option value="">{locale === "sq" ? "Zgjidh klientin" : "Choose client"}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select
          name="invoiceId"
          value={selectedInvoiceId}
          onChange={(event) => {
            setSelectedInvoiceId(event.target.value);
            setRows([{ ...emptyRow }]);
          }}
          className={inputClassName}
          required
          disabled={!selectedClientId}
        >
          <option value="">
            {locale === "sq" ? "Zgjidh faturën" : "Choose invoice"}
          </option>
          {clientInvoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.number} - {formatDate(invoice.issuedAt, localeString)}
            </option>
          ))}
        </select>
        <input
          name="issuedAt"
          type="date"
          defaultValue={today()}
          className={inputClassName}
          required
        />
        <select name="reason" className={inputClassName} defaultValue="ITEM_RETURNED" required>
          <option value="ITEM_RETURNED">{locale === "sq" ? "Artikull i kthyer" : "Item returned"}</option>
          <option value="PRICE_CORRECTION">{locale === "sq" ? "Korrigjim çmimi" : "Price correction"}</option>
          <option value="DAMAGED_ITEM">{locale === "sq" ? "Artikull i dëmtuar" : "Damaged item"}</option>
          <option value="ORDER_ADJUSTMENT">{locale === "sq" ? "Rregullim porosie" : "Order adjustment"}</option>
          <option value="OTHER">{locale === "sq" ? "Tjetër" : "Other"}</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto_140px]">
        <textarea
          name="notes"
          className={inputClassName}
          placeholder={locale === "sq" ? "Arsyeja / Përshkrimi" : "Reason / Description"}
        />
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            name="vatEnabled"
            checked={vatEnabled}
            onChange={(event) => setVatEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          {locale === "sq" ? "Apliko TVSH" : "Apply VAT"} (18%)
        </label>
        <input type="hidden" name="vatRate" value="18" />
      </div>
      {selectedInvoice ? (
        <div className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3 text-sm text-[var(--color-muted)]">
          {locale === "sq" ? "Borxhi i rregulluar" : "Adjusted debt"}:{" "}
          <span className="font-semibold text-[var(--color-foreground)]">
            {formatCurrency(selectedInvoice.adjustedOutstandingCents, localeString)}
          </span>
        </div>
      ) : null}
      <div className="rounded-[24px] border border-black/8 bg-white/70 p-4 sm:rounded-[26px] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-[var(--color-foreground)]">
            {locale === "sq" ? "Artikujt e kthyer / korrigjuar" : "Returned / corrected items"}
          </h3>
          <Button
            type="button"
            variant="tonal"
            disabled={!selectedInvoice}
            onClick={() => setRows((current) => [...current, { ...emptyRow }])}
          >
            <Plus className="mr-2 h-4 w-4" />
            {locale === "sq" ? "Shto rresht" : "Add row"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const selectedItem = invoiceItems.find(
              (item) => item.id === row.invoiceItemId,
            );

            return (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_130px_150px_56px]">
                <select
                  value={row.invoiceItemId}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) => {
                        if (itemIndex !== index) {
                          return item;
                        }

                        const invoiceItem = invoiceItems.find(
                          (option) => option.id === event.target.value,
                        );

                        return {
                          invoiceItemId: event.target.value,
                          quantity: invoiceItem ? "1" : "",
                          unitPrice: invoiceItem
                            ? (invoiceItem.unitPriceCents / 100).toFixed(2)
                            : "",
                        };
                      }),
                    )
                  }
                  className={inputClassName}
                  disabled={!selectedInvoice}
                >
                  <option value="">
                    {locale === "sq" ? "Zgjidh artikull" : "Choose item"}
                  </option>
                  {invoiceItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {locale === "sq" ? "mbetur" : "remaining"}{" "}
                      {item.remainingQuantity}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={selectedItem?.remainingQuantity}
                  value={row.quantity}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className={inputClassName}
                  aria-label={locale === "sq" ? "Sasia" : "Quantity"}
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, unitPrice: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className={inputClassName}
                  aria-label={locale === "sq" ? "Çmimi për njësi" : "Unit price"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={locale === "sq" ? "Hiq rreshtin" : "Remove row"}
                  onClick={() =>
                    setRows((current) =>
                      current.length === 1
                        ? [{ ...emptyRow }]
                        : current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-[var(--color-muted)]">
        <span>{locale === "sq" ? "Nëntotali" : "Subtotal"}: {formatCurrency(subtotalCents, localeString)}</span>
        <span>{locale === "sq" ? "TVSH" : "VAT"}: {formatCurrency(vatCents, localeString)}</span>
        <span className="font-semibold text-[var(--color-foreground)]">
          {locale === "sq" ? "Totali" : "Total"}: {formatCurrency(totalCents, localeString)}
        </span>
      </div>
      <input
        type="hidden"
        name="itemsData"
        value={JSON.stringify(
          rows
            .filter((row) => row.invoiceItemId)
            .map((row) => ({
              invoiceItemId: row.invoiceItemId,
              quantity: Number(row.quantity || 1),
              unitPrice: Number(row.unitPrice || 0),
            })),
        )}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {closeCreateFormPanel ? (
          <Button type="button" variant="secondary" onClick={closeCreateFormPanel}>
            {locale === "sq" ? "Anulo" : "Cancel"}
          </Button>
        ) : null}
        <SubmitButton>
          {locale === "sq" ? "Krijo debit note" : "Create debit note"}
        </SubmitButton>
      </div>
    </form>
  );
}
