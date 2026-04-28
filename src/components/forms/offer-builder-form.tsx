"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

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
  vatRate: number;
};

type OfferRow = {
  materialId: string;
  quantity: number;
  unitPrice: number;
};

const emptyRow: OfferRow = {
  materialId: "",
  quantity: 1,
  unitPrice: 0,
};

export function OfferBuilderForm({
  locale,
  clients,
  leads,
  items,
  action,
}: {
  locale: Locale;
  clients: ClientOption[];
  leads: Array<{ id: string; name: string }>;
  items: InventoryItemOption[];
  action: FormAction;
}) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [rows, setRows] = useState<OfferRow[]>([{ ...emptyRow }]);
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId],
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <select
          name="clientId"
          className={inputClassName}
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
          required
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select name="leadId" className={inputClassName} defaultValue="">
          <option value="">{locale === "sq" ? "Pa kërkesë" : "No request"}</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <select name="status" className={inputClassName} defaultValue="PENDING">
          <option value="PENDING">{locale === "sq" ? "Në pritje" : "Pending"}</option>
          <option value="ACCEPTED">{locale === "sq" ? "E pranuar" : "Accepted"}</option>
          <option value="REJECTED">{locale === "sq" ? "E refuzuar" : "Rejected"}</option>
        </select>
        <input
          name="validUntil"
          type="date"
          className={inputClassName}
          required
        />
      </div>
      <textarea name="notes" className={inputClassName} placeholder={locale === "sq" ? "Shënime" : "Notes"} />
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
          {locale === "sq" ? "TVSH e klientit" : "Client VAT"}: {selectedClient?.vatRate ?? 18}%
        </span>
      </div>
      <div className="rounded-[26px] border border-black/8 bg-white/70 p-5">
        <div className="flex items-center justify-between gap-4">
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
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_140px_160px_56px]">
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
                        unitPrice: inventoryItem ? inventoryItem.unitPriceCents / 100 : 0,
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
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, quantity: Number(event.target.value) }
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
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, unitPrice: Number(event.target.value) }
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
      <input type="hidden" name="itemsData" value={JSON.stringify(rows.filter((row) => row.materialId))} />
      <SubmitButton>{locale === "sq" ? "Krijo ofertë" : "Create offer"}</SubmitButton>
    </form>
  );
}
