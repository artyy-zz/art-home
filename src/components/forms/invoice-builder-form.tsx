"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductOption = {
  id: string;
  name: string;
  basePriceCents: number;
  categoryTitle: string;
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

export function InvoiceBuilderForm({
  locale,
  clients,
  products,
  action,
}: {
  locale: Locale;
  clients: Array<{ id: string; name: string }>;
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
      <div className="grid gap-4 md:grid-cols-3">
        <select name="clientId" className={inputClassName} defaultValue={clients[0]?.id} required>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select name="status" className={inputClassName} defaultValue="UNPAID">
          <option value="UNPAID">{locale === "sq" ? "E papaguar" : "Unpaid"}</option>
          <option value="PARTIAL">{locale === "sq" ? "Pjesërisht" : "Partial"}</option>
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
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <input
          name="vatRate"
          type="number"
          step="0.01"
          className={inputClassName}
          defaultValue={18}
        />
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            name="vatEnabled"
            checked={vatEnabled}
            onChange={(event) => setVatEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          {locale === "sq" ? "Apliko TVSH" : "Apply VAT"}
        </label>
      </div>
      <textarea
        name="notes"
        className={inputClassName}
        placeholder={locale === "sq" ? "Shënime" : "Notes"}
      />
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
            <div
              key={`${row.productId}-${index}`}
              className="grid gap-3 md:grid-cols-[1fr_140px_160px_56px]"
            >
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
                aria-label={locale === "sq" ? "Sasia" : "Quantity"}
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
                aria-label={locale === "sq" ? "Çmimi për njësi" : "Unit price"}
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
      <input type="hidden" name="itemsData" value={JSON.stringify(rows.filter((row) => row.productId))} />
      <SubmitButton>{locale === "sq" ? "Krijo faturë" : "Create invoice"}</SubmitButton>
    </form>
  );
}
