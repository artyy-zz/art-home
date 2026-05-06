"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateFormPanel } from "@/components/admin/create-form-panel";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { formatDateInputValue } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

type PartyOption = {
  id: string;
  name: string;
};

type InventoryItemOption = {
  id: string;
  name: string;
  sku: string;
  categoryTitle: string;
};

type DeliveryNoteRow = {
  materialId: string;
  quantity: string;
};

const emptyRow: DeliveryNoteRow = {
  materialId: "",
  quantity: "1",
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

function today() {
  return formatDateInputValue();
}

export function DeliveryNoteBuilderForm({
  locale,
  clients,
  suppliers,
  items,
  action,
}: {
  locale: Locale;
  clients: PartyOption[];
  suppliers: PartyOption[];
  items: InventoryItemOption[];
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const [type, setType] = useState<"SALES" | "PURCHASE">("SALES");
  const [rows, setRows] = useState<DeliveryNoteRow[]>([{ ...emptyRow }]);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setType("SALES");
    setRows([{ ...emptyRow }]);
    closeCreateFormPanel?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as "SALES" | "PURCHASE")}
          className={inputClassName}
          required
        >
          <option value="SALES">
            {locale === "sq" ? "Fletë Dërgesë Shitje" : "Sales Delivery Note"}
          </option>
          <option value="PURCHASE">
            {locale === "sq" ? "Fletë Dërgesë Blerje" : "Purchase Delivery Note"}
          </option>
        </select>
        {type === "SALES" ? (
          <select name="clientId" className={inputClassName} defaultValue="" required>
            <option value="" disabled>
              {locale === "sq" ? "Zgjidh klientin" : "Choose client"}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        ) : (
          <select name="supplierId" className={inputClassName} defaultValue="" required>
            <option value="" disabled>
              {locale === "sq" ? "Zgjidh furnitorin" : "Choose supplier"}
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        )}
        <select name="status" className={inputClassName} defaultValue="DRAFT" required>
          <option value="DRAFT">{locale === "sq" ? "Draft" : "Draft"}</option>
          <option value="DELIVERED">{locale === "sq" ? "Dërguar" : "Delivered"}</option>
          <option value="CANCELLED">{locale === "sq" ? "Anuluar" : "Cancelled"}</option>
        </select>
        <input
          name="issuedAt"
          type="date"
          defaultValue={today()}
          className={inputClassName}
          required
        />
      </div>
      <textarea
        name="notes"
        className={inputClassName}
        placeholder={locale === "sq" ? "Përshkrimi / Shënime" : "Description / Notes"}
      />
      <div className="rounded-[26px] border border-black/8 bg-white/70 p-5">
        <div className="flex items-center justify-between gap-4">
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
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_140px_56px]">
              <select
                value={row.materialId}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, materialId: event.target.value }
                        : item,
                    ),
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
                min={1}
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
            })),
        )}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {closeCreateFormPanel ? (
          <Button type="button" variant="secondary" onClick={closeCreateFormPanel}>
            {locale === "sq" ? "Anulo" : "Cancel"}
          </Button>
        ) : null}
        <SubmitButton>
          {locale === "sq" ? "Krijo fletë dërgesë" : "Create delivery note"}
        </SubmitButton>
      </div>
    </form>
  );
}
