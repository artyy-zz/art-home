"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateFormPanel } from "@/components/admin/create-form-panel";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { centsToDecimalString, multiplyCentsByDecimal, parseMoneyToCents } from "@/lib/money";
import { formatDateInputValue } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

type InventoryItemOption = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unitPriceCents: number;
  categoryTitle: string;
};

type SupplierOption = {
  id: string;
  name: string;
};

type ExpenseRow = {
  materialId: string;
  quantity: string;
  unitPrice: string;
};

const emptyRow: ExpenseRow = {
  materialId: "",
  quantity: "1",
  unitPrice: "0.00",
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

function getTodayInputValue() {
  return formatDateInputValue();
}

export function ExpenseBuilderForm({
  locale,
  suppliers,
  items,
  action,
}: {
  locale: Locale;
  suppliers: SupplierOption[];
  items: InventoryItemOption[];
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [status, setStatus] = useState("");
  const [dueDate, setDueDate] = useState(getTodayInputValue);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [rows, setRows] = useState<ExpenseRow[]>([{ ...emptyRow }]);
  const [error, setError] = useState("");

  const subtotalCents = rows
    .filter((row) => row.materialId)
    .reduce(
      (sum, row) =>
        sum + multiplyCentsByDecimal(parseMoneyToCents(row.unitPrice), row.quantity),
      0,
    );
  const amountCents = subtotalCents > 0 ? subtotalCents : parseMoneyToCents(amountPaid || "0");
  const selectedSupplierLabel =
    selectedSupplierName || (locale === "sq" ? "Pa furnitor" : "No supplier");
  const expenseName =
    locale === "sq"
      ? `Shpenzim - ${selectedSupplierLabel}`
      : `Expense - ${selectedSupplierLabel}`;
  const itemSummary = rows
    .filter((row) => row.materialId)
    .map((row) => {
      const item = items.find((option) => option.id === row.materialId);
      return item ? `${item.name}: ${row.quantity} x ${row.unitPrice}` : null;
    })
    .filter(Boolean)
    .join("\n");
  const description = [
    notes,
    status ? `${locale === "sq" ? "Statusi" : "Status"}: ${status}` : "",
    amountPaid ? `${locale === "sq" ? "Paguar EUR" : "Paid EUR"}: ${amountPaid}` : "",
    itemSummary,
  ]
    .filter(Boolean)
    .join("\n\n");

  async function handleSubmit(formData: FormData) {
    setError("");

    try {
      await action(formData);
      formRef.current?.reset();
      setSelectedSupplierName("");
      setStatus("");
      setDueDate(getTodayInputValue());
      setAmountPaid("");
      setNotes("");
      setVatEnabled(true);
      setRows([{ ...emptyRow }]);
      closeCreateFormPanel?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : locale === "sq"
            ? "Shpenzimi nuk mund të ruhej."
            : "Expense could not be saved.",
      );
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="name" value={expenseName} />
      <input type="hidden" name="category" value="OTHER" />
      <input type="hidden" name="amount" value={centsToDecimalString(amountCents)} />
      <input type="hidden" name="vatRate" value="18" />
      <input type="hidden" name="description" value={description} />

      <div className="grid gap-4 md:grid-cols-3">
        <select
          name="supplierName"
          className={inputClassName}
          value={selectedSupplierName}
          onChange={(event) => setSelectedSupplierName(event.target.value)}
          required
        >
          <option value="">{locale === "sq" ? "Zgjidh furnitorin" : "Choose supplier"}</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.name}>
              {supplier.name}
            </option>
          ))}
        </select>
        <select
          className={inputClassName}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          required
        >
          <option value="" disabled>{locale === "sq" ? "Statusi" : "Status"}</option>
          <option value="UNPAID">{locale === "sq" ? "E papaguar" : "Unpaid"}</option>
          <option value="PARTIAL">{locale === "sq" ? "Pjesërisht" : "Partial"}</option>
          <option value="PAID">{locale === "sq" ? "E paguar" : "Paid"}</option>
          <option value="OVERDUE">{locale === "sq" ? "E vonuar" : "Overdue"}</option>
        </select>
        <input
          name="date"
          type="date"
          className={inputClassName}
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClassName}
          placeholder={locale === "sq" ? "Paguar EUR" : "Paid EUR"}
          value={amountPaid}
          onChange={(event) => setAmountPaid(event.target.value)}
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
      </div>
      <textarea
        className={inputClassName}
        placeholder={locale === "sq" ? "Shënime" : "Notes"}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="rounded-[24px] border border-black/8 bg-white/70 p-4 sm:rounded-[26px] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-[var(--color-foreground)]">
            {locale === "sq" ? "Artikujt" : "Items"}
          </h3>
          <Button
            type="button"
            variant="tonal"
            onClick={() => setRows((current) => [...current, { ...emptyRow }])}
          >
            <Plus className="mr-2 h-4 w-4" />
            {locale === "sq" ? "Shto rresht" : "Add row"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid gap-3 md:grid-cols-[1fr_140px_160px_56px]"
            >
              <select
                value={row.materialId}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) => {
                      if (itemIndex !== index) {
                        return item;
                      }

                      const inventoryItem = items.find((option) => option.id === event.target.value);
                      return {
                        ...item,
                        materialId: event.target.value,
                        unitPrice: inventoryItem ? centsToDecimalString(inventoryItem.unitPriceCents) : "0.00",
                      };
                    }),
                  )
                }
                className={inputClassName}
              >
                <option value="">{locale === "sq" ? "Zgjidh artikull" : "Choose item"}</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.categoryTitle} - {item.sku}
                  </option>
                ))}
              </select>
              <input
                aria-label={locale === "sq" ? "Sasia" : "Quantity"}
                type="number"
                value={row.quantity}
                min={1}
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
              />
              <input
                aria-label={locale === "sq" ? "Çmimi për njësi" : "Unit price"}
                type="number"
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
              />
              <Button
                type="button"
                variant="ghost"
                aria-label={locale === "sq" ? "Hiq rreshtin" : "Remove row"}
                onClick={() =>
                  setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {error ? (
          <p className="w-full rounded-2xl bg-[rgba(140,47,43,0.09)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
        {closeCreateFormPanel ? (
          <Button type="button" variant="secondary" onClick={closeCreateFormPanel}>
            {locale === "sq" ? "Anulo" : "Cancel"}
          </Button>
        ) : null}
        <SubmitButton>
          {locale === "sq" ? "Krijo shpenzim" : "Create expense"}
        </SubmitButton>
      </div>
    </form>
  );
}
