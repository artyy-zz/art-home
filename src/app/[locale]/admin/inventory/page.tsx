import {
  adjustInventoryAction,
  createMaterialAction,
  deleteMaterialAction,
  updateMaterialAction,
} from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { getInventoryOverview, materialTypeLabel } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function InventoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/inventory">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "INVENTORY", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "stock";
  const direction = param(resolvedSearchParams, "dir") === "desc" ? "desc" : "asc";
  const materials = await getInventoryOverview();
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "INVENTORY", "CREATE");
  const canEdit = can(permissions, "INVENTORY", "EDIT");
  const canDelete = can(permissions, "INVENTORY", "DELETE");

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Shto material" : "Add material"}
          </h2>
          <form action={createMaterialAction.bind(null, typedLocale)} className="mt-6 grid gap-4 md:grid-cols-3">
            <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri" : "Name"} />
            <input name="sku" required className={inputClassName} placeholder="SKU" />
            <select name="type" className={inputClassName}>
              <option value="WOOD">WOOD</option>
              <option value="HARDWARE">HARDWARE</option>
              <option value="COMPONENT">COMPONENT</option>
              <option value="FINISH">FINISH</option>
              <option value="ACCESSORY">ACCESSORY</option>
            </select>
            <select name="unit" className={inputClassName}>
              <option value="PCS">PCS</option>
              <option value="SET">SET</option>
              <option value="METER">METER</option>
              <option value="SQM">SQM</option>
              <option value="KG">KG</option>
            </select>
            <input name="stockQuantity" type="number" step="0.01" className={inputClassName} placeholder={typedLocale === "sq" ? "Stoku" : "Stock"} />
            <input name="lowStockThreshold" type="number" step="0.01" className={inputClassName} placeholder={typedLocale === "sq" ? "Pragu i stokut të ulët" : "Low-stock threshold"} />
            <input name="costPerUnit" type="number" step="0.01" className={inputClassName} placeholder={typedLocale === "sq" ? "Kosto / njësi EUR" : "Cost / unit EUR"} />
            <textarea name="notes" className={`${inputClassName} md:col-span-2`} placeholder={typedLocale === "sq" ? "Shënime" : "Notes"} />
            <button className={buttonClasses({ className: "md:w-fit" })}>
              {typedLocale === "sq" ? "Ruaj materialin" : "Save material"}
            </button>
          </form>
        </Card>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/inventory`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kërko material, SKU ose lloj" : "Search material, SKU, or type"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka materiale për këtë kërkim."
              : "No materials match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "material", label: typedLocale === "sq" ? "Materiali" : "Material", sortable: true },
            { key: "type", label: typedLocale === "sq" ? "Lloji" : "Type", sortable: true },
            { key: "stock", label: typedLocale === "sq" ? "Stoku" : "Stock", sortable: true },
            { key: "threshold", label: typedLocale === "sq" ? "Pragu" : "Threshold", sortable: true },
            { key: "cost", label: typedLocale === "sq" ? "Kosto" : "Cost", sortable: true, align: "right" },
          ]}
          rows={materials.map((material) => ({
            id: material.id,
            searchText: `${material.name} ${material.sku} ${material.type} ${material.notes ?? ""}`,
            sortValues: {
              material: material.name,
              type: material.type,
              stock: material.stockQuantity,
              threshold: material.lowStockThreshold,
              cost: material.costPerUnitCents,
            },
            cells: {
              material: (
                <div>
                  <p className="font-semibold">{material.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{material.sku}</p>
                </div>
              ),
              type: materialTypeLabel(material.type, typedLocale),
              stock: (
                <Badge tone={material.stockQuantity <= material.lowStockThreshold ? "warning" : "success"}>
                  {formatNumber(material.stockQuantity, localeString)} {material.unit}
                </Badge>
              ),
              threshold: `${formatNumber(material.lowStockThreshold, localeString)} ${material.unit}`,
              cost: formatCurrency(material.costPerUnitCents, localeString),
            },
            actions: (
              <>
                <details className="w-full min-w-[260px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                  <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                    {typedLocale === "sq" ? "Shiko" : "View"}
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {material.notes || (typedLocale === "sq" ? "Pa shënime shtesë." : "No additional notes.")}
                  </p>
                </details>
                {canEdit ? (
                  <form action={adjustInventoryAction.bind(null, typedLocale, material.id)} className="flex flex-wrap gap-2">
                    <input name="quantity" type="number" step="0.01" className="h-10 w-28 rounded-full border border-black/10 bg-white/90 px-3 text-sm" placeholder={typedLocale === "sq" ? "+ Sasia" : "+ Qty"} />
                    <input name="note" className="h-10 w-40 rounded-full border border-black/10 bg-white/90 px-3 text-sm" placeholder={typedLocale === "sq" ? "Shënim" : "Note"} />
                    <button className={buttonClasses({ size: "sm" })}>
                      {typedLocale === "sq" ? "Shto" : "Restock"}
                    </button>
                  </form>
                ) : null}
                {canEdit ? (
                  <details className="w-full min-w-[300px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                    <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                      {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                    </summary>
                    <form action={updateMaterialAction.bind(null, typedLocale, material.id)} className="mt-3 grid gap-2">
                      <input name="name" required defaultValue={material.name} className={inputClassName} />
                      <input name="sku" required defaultValue={material.sku} className={inputClassName} />
                      <select name="type" defaultValue={material.type} className={inputClassName}>
                        <option value="WOOD">WOOD</option>
                        <option value="HARDWARE">HARDWARE</option>
                        <option value="COMPONENT">COMPONENT</option>
                        <option value="FINISH">FINISH</option>
                        <option value="ACCESSORY">ACCESSORY</option>
                      </select>
                      <select name="unit" defaultValue={material.unit} className={inputClassName}>
                        <option value="PCS">PCS</option>
                        <option value="SET">SET</option>
                        <option value="METER">METER</option>
                        <option value="SQM">SQM</option>
                        <option value="KG">KG</option>
                      </select>
                      <input name="stockQuantity" type="number" step="0.01" defaultValue={material.stockQuantity} className={inputClassName} />
                      <input name="lowStockThreshold" type="number" step="0.01" defaultValue={material.lowStockThreshold} className={inputClassName} />
                      <input name="costPerUnit" type="number" step="0.01" defaultValue={material.costPerUnitCents / 100} className={inputClassName} />
                      <textarea name="notes" defaultValue={material.notes ?? ""} className={inputClassName} />
                      <button className={buttonClasses({ size: "sm" })}>
                        {typedLocale === "sq" ? "Ruaj" : "Save"}
                      </button>
                    </form>
                  </details>
                ) : null}
                {canDelete ? (
                  <form action={deleteMaterialAction.bind(null, typedLocale, material.id)}>
                    <button className={buttonClasses({ variant: "danger", size: "sm" })}>
                      {typedLocale === "sq" ? "Fshi" : "Delete"}
                    </button>
                  </form>
                ) : null}
              </>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
