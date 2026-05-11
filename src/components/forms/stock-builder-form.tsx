"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useCreateFormPanel } from "@/components/admin/create-form-panel";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

export type StockMaterialOption = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stockQuantity: number;
};

export type StockFormRow = {
  materialId: string;
  quantity: number | string;
};

type StockBuilderFormProps = {
  locale: Locale;
  materials: StockMaterialOption[];
  action: FormAction;
  submitLabel: string;
  initial?: {
    name: string;
    price: string;
    rows: StockFormRow[];
  };
  onCancel?: () => void;
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

const emptyRow: StockFormRow = {
  materialId: "",
  quantity: "",
};

export function StockBuilderForm({
  locale,
  materials,
  action,
  submitLabel,
  initial,
  onCancel,
}: StockBuilderFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const closeCreateFormPanel = useCreateFormPanel();
  const closeForm = onCancel ?? closeCreateFormPanel;
  const localeString = locale === "sq" ? "sq-AL" : "en-GB";
  const [rows, setRows] = useState<StockFormRow[]>(
    initial?.rows.length ? initial.rows : [{ ...emptyRow }],
  );
  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setRows(initial?.rows.length ? initial.rows : [{ ...emptyRow }]);
    closeForm?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          className={inputClassName}
          placeholder={locale === "sq" ? "Emri" : "Name"}
        />
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={initial?.price ?? ""}
          className={inputClassName}
          placeholder={locale === "sq" ? "Çmimi" : "Price"}
        />
      </div>

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
          {rows.map((row, index) => {
            const selectedMaterial = materialMap.get(String(row.materialId));

            return (
              <div
                key={index}
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_56px]"
              >
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-[var(--color-muted)]">
                    {locale === "sq" ? "Artikull" : "Item"}
                  </span>
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
                    <option value="">
                      {locale === "sq" ? "Zgjidh artikull" : "Choose item"}
                    </option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} - {material.sku}
                      </option>
                    ))}
                  </select>
                  {selectedMaterial ? (
                    <span className="text-xs text-[var(--color-muted)]">
                      {locale === "sq" ? "Gjendja" : "Available"}:{" "}
                      {formatNumber(selectedMaterial.stockQuantity, localeString)}{" "}
                      {selectedMaterial.unit}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-[var(--color-muted)]">
                    {locale === "sq" ? "Sasia" : "Quantity"}
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
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
                    placeholder={locale === "sq" ? "Sasia" : "Quantity"}
                  />
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  className="self-end"
                  aria-label={locale === "sq" ? "Hiq rreshtin" : "Remove row"}
                  onClick={() =>
                    setRows((current) =>
                      current.length > 1
                        ? current.filter((_, itemIndex) => itemIndex !== index)
                        : [{ ...emptyRow }],
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

      <input
        type="hidden"
        name="itemsData"
        value={JSON.stringify(
          rows
            .filter((row) => row.materialId)
            .map((row) => ({
              materialId: row.materialId,
              quantity: Number(row.quantity || 0),
            })),
        )}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {closeForm ? (
          <Button type="button" variant="secondary" onClick={closeForm}>
            {locale === "sq" ? "Anulo" : "Cancel"}
          </Button>
        ) : null}
        <SubmitButton>
          <Save className="mr-2 h-4 w-4" />
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
