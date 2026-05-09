"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  deleteStokAction,
  updateStokAction,
} from "@/actions/admin";
import { LazyStockBuilderForm } from "@/components/admin/lazy-admin-options";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";

type StockItem = {
  id: string;
  quantity: number;
  material: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    stockQuantity: number;
  };
};

type StockActionsProps = {
  locale: Locale;
  stock: {
    id: string;
    name: string;
    priceCents: number;
    items: StockItem[];
  };
  canEdit: boolean;
  canDelete: boolean;
};

export function StockActions({
  locale,
  stock,
  canEdit,
  canDelete,
}: StockActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}
          >
            <Pencil className="h-4 w-4" />
            {locale === "sq" ? "Ndrysho" : "Edit"}
          </button>
        ) : null}
        {canDelete ? (
          <form action={deleteStokAction.bind(null, locale, stock.id)}>
            <ConfirmDeleteButton
              label={locale === "sq" ? "Fshi" : "Delete"}
              title={locale === "sq" ? "Konfirmo fshirjen" : "Confirm delete"}
              cancelLabel={locale === "sq" ? "Anulo" : "Cancel"}
              closeLabel={locale === "sq" ? "Mbyll" : "Close"}
              message={
                locale === "sq"
                  ? `A je i sigurt qe deshiron ta fshish stokun "${stock.name}"? Artikujt nuk do te fshihen.`
                  : `Are you sure you want to delete stock "${stock.name}"? Items will not be deleted.`
              }
            />
          </form>
        ) : null}
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-black/10 bg-[#fbf8f4] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
                  {locale === "sq" ? "Ndrysho Stokun" : "Edit Stock"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{stock.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
                aria-label={locale === "sq" ? "Mbyll" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <LazyStockBuilderForm
                locale={locale}
                mode="edit"
                action={updateStokAction.bind(null, locale, stock.id)}
                submitLabel={locale === "sq" ? "Ruaj Stokun" : "Save Stock"}
                initial={{
                  name: stock.name,
                  price: stock.priceCents / 100,
                  rows: stock.items.map((item) => ({
                    materialId: item.material.id,
                    quantity: item.quantity,
                  })),
                }}
                onCancel={() => setEditOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
