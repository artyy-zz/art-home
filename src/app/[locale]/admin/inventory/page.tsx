import { withPagePerf } from "@/lib/perf";
import { createMaterialAction } from "@/actions/admin";
import { MaterialType } from "@prisma/client";
import { CreateActionForm, CreateFormPanel } from "@/components/admin/create-form-panel";
import { InventoryActions } from "@/components/admin/inventory-actions";
import { RecordTable } from "@/components/admin/record-table";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { getInventoryOverview, materialTypeLabel } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const materialTypeOptions = [
  MaterialType.WOOD,
  MaterialType.HARDWARE,
  MaterialType.COMPONENT,
  MaterialType.FINISH,
  MaterialType.ACCESSORY,
];

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function InventoryPage({
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
  const rows = measureDetailSync(
    "admin/inventory.table mapping/formatting",
    () =>
      materials.map((material) => ({
        id: material.id,
        searchText: `${material.name} ${material.sku} ${materialTypeLabel(material.type, typedLocale)} ${material.notes ?? ""}`,
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
          notes: (
            <p className="max-w-[240px] whitespace-pre-wrap text-[var(--color-muted)]">
              {material.notes || (typedLocale === "sq" ? "Pa shenime." : "No notes.")}
            </p>
          ),
        },
        actions: (
          <InventoryActions
            locale={typedLocale}
            material={{
              id: material.id,
              name: material.name,
              sku: material.sku,
              type: material.type,
              unit: material.unit,
              stockQuantity: material.stockQuantity,
              lowStockThreshold: material.lowStockThreshold,
              costPerUnitCents: material.costPerUnitCents,
              notes: material.notes,
            }}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ),
      })),
    { locale: typedLocale, rows: materials.length },
  );

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto artikull" : "Add item"}
          buttonLabel={typedLocale === "sq" ? "Shto artikull" : "Add item"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <CreateActionForm
            action={createMaterialAction.bind(null, typedLocale)}
            className="grid gap-4 md:grid-cols-3"
            submitLabel={typedLocale === "sq" ? "Ruaj artikullin" : "Save item"}
            cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
            errorMessage={typedLocale === "sq" ? "Artikulli nuk u ruajt." : "Item could not be saved."}
            footerClassName="md:col-span-3"
          >
            <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri" : "Name"} />
            <input name="sku" required className={inputClassName} placeholder="SKU" />
            <select name="type" required className={inputClassName}>
              {materialTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {materialTypeLabel(type, typedLocale)}
                </option>
              ))}
            </select>
            <select name="unit" required className={inputClassName}>
              <option value="PCS">PCS</option>
              <option value="SET">SET</option>
              <option value="METER">METER</option>
              <option value="SQM">SQM</option>
              <option value="KG">KG</option>
            </select>
            <input name="stockQuantity" type="number" min="0" step="0.01" required className={inputClassName} placeholder={typedLocale === "sq" ? "Stoku" : "Stock"} />
            <input name="lowStockThreshold" type="number" min="0" step="0.01" required className={inputClassName} placeholder={typedLocale === "sq" ? "Pragu i stokut te ulet" : "Low-stock threshold"} />
            <input name="costPerUnit" type="number" min="0" step="0.01" required className={inputClassName} placeholder={typedLocale === "sq" ? "Çmimi" : "Price"} />
            <textarea name="notes" className={`${inputClassName} md:col-span-2`} placeholder={typedLocale === "sq" ? "Shenime" : "Notes"} />
          </CreateActionForm>
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/inventory`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kerko artikull, SKU ose lloj" : "Search item, SKU, or type"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka artikuj per kete kerkim."
              : "No items match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "material", label: typedLocale === "sq" ? "Artikulli" : "Item", sortable: true },
            { key: "type", label: typedLocale === "sq" ? "Lloji" : "Type", sortable: true },
            { key: "stock", label: typedLocale === "sq" ? "Stoku" : "Stock", sortable: true },
            { key: "threshold", label: typedLocale === "sq" ? "Pragu" : "Threshold", sortable: true },
            { key: "cost", label: typedLocale === "sq" ? "Çmimi" : "Price", sortable: true, align: "right" },
            { key: "notes", label: typedLocale === "sq" ? "Shenime" : "Notes" },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
}

export default withPagePerf("admin/inventory", InventoryPage);
