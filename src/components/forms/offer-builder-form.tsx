"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateFormPanel, useFinishCreateForm } from "@/components/admin/create-form-panel";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { formatDateInputValue } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

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

type OfferRow = {
  materialId: string;
  productName: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

const emptyRow: OfferRow = {
  materialId: "",
  productName: "",
  description: "",
  quantity: "",
  unitPrice: "",
};

function defaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return formatDateInputValue(date);
}

export function OfferBuilderForm({
  locale,
  clients,
  items,
  action,
}: {
  locale: Locale;
  clients: ClientOption[];
  leads?: Array<{ id: string; name: string }>;
  items: InventoryItemOption[];
  action: FormAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const finishCreateForm = useFinishCreateForm();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [rows, setRows] = useState<OfferRow[]>([{ ...emptyRow }]);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setSelectedClientId("");
    setVatEnabled(true);
    setRows([{ ...emptyRow }]);
    finishCreateForm();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="number"
          className={inputClassName}
          placeholder={locale === "sq" ? "Numri i ofertes" : "Offer number"}
          required
        />
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
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <select name="status" className={inputClassName} defaultValue="" required>
          <option value="" disabled>{locale === "sq" ? "Statusi" : "Status"}</option>
          <option value="PENDING">{locale === "sq" ? "Ne pritje" : "Pending"}</option>
          <option value="ACCEPTED">{locale === "sq" ? "E pranuar" : "Accepted"}</option>
          <option value="REJECTED">{locale === "sq" ? "E refuzuar" : "Rejected"}</option>
        </select>
        <input
          name="validUntil"
          type="date"
          className={inputClassName}
          defaultValue={defaultValidUntil()}
          required
        />
      </div>
      <textarea name="notes" className={inputClassName} placeholder={locale === "sq" ? "Shenime" : "Notes"} />
      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-muted)]">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="vatEnabled"
            checked={vatEnabled}
            onChange={(event) => setVatEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          {locale === "sq" ? "Apliko TVSH" : "Apply VAT"}
        </label>
        <span>
          {locale === "sq" ? "TVSH standarde" : "Standard VAT"}: 18%
        </span>
      </div>
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
            <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_150px_56px]">
              <input
                type="text"
                value={row.productName}
                placeholder={locale === "sq" ? "Artikulli" : "Item"}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, productName: event.target.value, materialId: "" }
                        : item,
                    ),
                  )
                }
                className={inputClassName}
                list={`offer-items-${index}`}
                required
              />
              <datalist id={`offer-items-${index}`}>
                {items.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.categoryTitle} - {item.sku}
                  </option>
                ))}
              </datalist>
              <input
                type="text"
                value={row.description}
                placeholder={locale === "sq" ? "Pershkrimi" : "Description"}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
                className={inputClassName}
              />
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
            .filter((row) => row.productName.trim())
            .map((row) => ({
              materialId: row.materialId || undefined,
              productName: row.productName,
              description: row.description,
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
        <SubmitButton>{locale === "sq" ? "Krijo oferte" : "Create offer"}</SubmitButton>
      </div>
    </form>
  );
}
