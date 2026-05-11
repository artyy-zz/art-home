"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateFormPanel } from "@/components/admin/create-form-panel";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { centsToDecimalString } from "@/lib/money";
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

type ClientOption = {
  id: string;
  name: string;
};

type InvoiceRow = {
  materialId: string;
  quantity: string;
  unitPrice: string;
};

const emptyRow: InvoiceRow = {
  materialId: "",
  quantity: "",
  unitPrice: "",
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return formatDateInputValue(date);
}

export function InvoiceBuilderForm({
  locale,
  clients,
  items,
  action,
}: {
  locale: Locale;
  clients: ClientOption[];
  items: InventoryItemOption[];
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([{ ...emptyRow }]);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setSelectedClientId("");
    setVatEnabled(true);
    setRows([{ ...emptyRow }]);
    closeCreateFormPanel?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <select
          name="clientId"
          className={inputClassName}
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
          required
        >
          <option value="">{locale === "sq" ? "Zgjidh klientin" : "Choose client"}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select name="status" className={inputClassName} defaultValue="" required>
          <option value="" disabled>{locale === "sq" ? "Statusi" : "Status"}</option>
          <option value="UNPAID">{locale === "sq" ? "E papaguar" : "Unpaid"}</option>
          <option value="PARTIAL">{locale === "sq" ? "Pjeserisht" : "Partial"}</option>
          <option value="PAID">{locale === "sq" ? "E paguar" : "Paid"}</option>
          <option value="OVERDUE">{locale === "sq" ? "E vonuar" : "Overdue"}</option>
        </select>
        <input
          name="dueDate"
          type="date"
          className={inputClassName}
          defaultValue={defaultDueDate()}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[auto]">
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
        name="notes"
        className={inputClassName}
        placeholder={locale === "sq" ? "Shenime" : "Notes"}
      />
      <div className="rounded-[24px] border border-black/8 bg-white/70 p-4 sm:rounded-[26px] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-[var(--color-foreground)]">
            {locale === "sq" ? "Artikujt" : "Items"}
          </h3>
          <Button
            type="button"
            variant="tonal"
            onClick={() =>
              setRows((current) => [
                ...current,
                { ...emptyRow },
              ])
            }
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
                      if (!inventoryItem) {
                        return { ...emptyRow };
                      }

                      return {
                        ...item,
                        materialId: event.target.value,
                        quantity: item.quantity || "1",
                        unitPrice: centsToDecimalString(inventoryItem.unitPriceCents),
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
                type="number"
                value={row.quantity}
                min={1}
                placeholder={locale === "sq" ? "Sasia" : "Quantity"}
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
                type="number"
                step="0.01"
                value={row.unitPrice}
                placeholder={locale === "sq" ? "Cmimi" : "Price"}
                readOnly
                className={`${inputClassName} bg-[#f7f2ec]`}
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
      <input
        type="hidden"
        name="itemsData"
        value={JSON.stringify(
          rows
            .filter((row) => row.materialId)
            .map((row) => ({
              materialId: row.materialId,
              quantity: Number(row.quantity || 1),
              unitPrice: Number(row.unitPrice),
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
          {locale === "sq" ? "Krijo fature shitjeje" : "Create sales invoice"}
        </SubmitButton>
      </div>
    </form>
  );
}
