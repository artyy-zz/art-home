"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

export function ProductBuilderForm({
  locale,
  materials,
  action,
}: {
  locale: Locale;
  materials: Array<{ id: string; name: string; unit: string; type: string }>;
  action: FormAction;
}) {
  const [rows, setRows] = useState([{ materialId: materials[0]?.id ?? "", quantity: 1 }]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input name="nameSq" className={inputClassName} placeholder="Emri SQ" required />
        <input name="nameEn" className={inputClassName} placeholder="Name EN" required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <select name="category" className={inputClassName} defaultValue="KITCHENS">
          <option value="KITCHENS">Kitchens</option>
          <option value="TABLES">Tables</option>
          <option value="WARDROBES">Wardrobes</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <input name="slug" className={inputClassName} placeholder="Slug (optional)" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          name="summarySq"
          className={inputClassName}
          placeholder="Pershkrim i shkurter SQ"
          required
        />
        <textarea
          name="summaryEn"
          className={inputClassName}
          placeholder="Short summary EN"
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          name="descriptionSq"
          className={inputClassName}
          placeholder="Pershkrim i plote SQ"
          required
        />
        <textarea
          name="descriptionEn"
          className={inputClassName}
          placeholder="Full description EN"
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <input name="dimensions" className={inputClassName} placeholder="Dimensions" />
        <input name="basePrice" type="number" step="0.01" className={inputClassName} placeholder="Base price EUR" required />
        <input name="laborCost" type="number" step="0.01" className={inputClassName} placeholder="Labor cost EUR" required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input name="materialNotesSq" className={inputClassName} placeholder="Materiale SQ" />
        <input name="materialNotesEn" className={inputClassName} placeholder="Materials EN" />
      </div>
      <label className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
        <input type="checkbox" name="featured" className="h-4 w-4" />
        {locale === "sq" ? "Shfaq si produkt i veçuar" : "Feature this product"}
      </label>

      <div className="rounded-[26px] border border-black/8 bg-white/70 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-[var(--color-foreground)]">BOM</h3>
          <Button
            type="button"
            variant="tonal"
            onClick={() =>
              setRows((current) => [...current, { materialId: materials[0]?.id ?? "", quantity: 1 }])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {locale === "sq" ? "Shto material" : "Add material"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.materialId}-${index}`} className="grid gap-3 md:grid-cols-[1fr_140px_56px]">
              <select
                value={row.materialId}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, materialId: event.target.value } : item,
                    ),
                  )
                }
                className={inputClassName}
              >
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={row.quantity}
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
      <input type="hidden" name="bomData" value={JSON.stringify(rows.filter((row) => row.materialId))} />
      <SubmitButton>{locale === "sq" ? "Krijo produkt" : "Create product"}</SubmitButton>
    </form>
  );
}
