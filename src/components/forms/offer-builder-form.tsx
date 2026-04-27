"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

type ProductOption = {
  id: string;
  name: string;
  basePriceCents: number;
  categoryTitle: string;
};

export function OfferBuilderForm({
  locale,
  clients,
  leads,
  products,
  action,
}: {
  locale: Locale;
  clients: Array<{ id: string; name: string }>;
  leads: Array<{ id: string; name: string }>;
  products: ProductOption[];
  action: FormAction;
}) {
  const [vatEnabled, setVatEnabled] = useState(true);
  const [rows, setRows] = useState([
    {
      productId: products[0]?.id ?? "",
      quantity: 1,
      unitPrice: products[0] ? products[0].basePriceCents / 100 : 0,
    },
  ]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <select name="clientId" className={inputClassName} defaultValue={clients[0]?.id} required>
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
      <div className="grid gap-4 md:grid-cols-3">
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
        <input name="vatRate" type="number" step="0.01" className={inputClassName} defaultValue={18} />
      </div>
      <textarea name="notes" className={inputClassName} placeholder={locale === "sq" ? "Shënime" : "Notes"} />
      <label className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
        <input
          type="checkbox"
          name="vatEnabled"
          checked={vatEnabled}
          onChange={(event) => setVatEnabled(event.target.checked)}
          className="h-4 w-4"
        />
        {locale === "sq" ? "Apliko TVSH" : "Apply VAT"}
      </label>
      <div className="rounded-[26px] border border-black/8 bg-white/70 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-[var(--color-foreground)]">
            {locale === "sq" ? "Artikujt" : "Items"}
          </h3>
          <Button
            type="button"
            variant="tonal"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  productId: products[0]?.id ?? "",
                  quantity: 1,
                  unitPrice: products[0] ? products[0].basePriceCents / 100 : 0,
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {locale === "sq" ? "Shto rresht" : "Add row"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.productId}-${index}`} className="grid gap-3 md:grid-cols-[1fr_140px_160px_56px]">
              <select
                value={row.productId}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) => {
                      if (itemIndex !== index) {
                        return item;
                      }

                      const product = products.find((option) => option.id === event.target.value);
                      return {
                        ...item,
                        productId: event.target.value,
                        unitPrice: product ? product.basePriceCents / 100 : item.unitPrice,
                      };
                    }),
                  )
                }
                className={inputClassName}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.categoryTitle}
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
      <input type="hidden" name="itemsData" value={JSON.stringify(rows.filter((row) => row.productId))} />
      <SubmitButton>{locale === "sq" ? "Krijo ofertë" : "Create offer"}</SubmitButton>
    </form>
  );
}
