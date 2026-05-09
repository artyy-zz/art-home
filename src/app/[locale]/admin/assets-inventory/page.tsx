import { withPagePerf } from "@/lib/perf";
import { createAssetInventoryAction } from "@/actions/admin";
import { AssetInventoryActions } from "@/components/admin/asset-inventory-actions";
import { CreateActionForm, CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { measureDetailAsync, measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function AssetsInventoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/assets-inventory">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "ASSETS_INVENTORY", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "purchaseDate";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "ASSETS_INVENTORY", "CREATE");
  const canEdit = can(permissions, "ASSETS_INVENTORY", "EDIT");
  const canDelete = can(permissions, "ASSETS_INVENTORY", "DELETE");

  const assets = await measureDetailAsync(
    "admin/assets-inventory.main data query",
    () =>
      prisma.assetInventory.findMany({
        orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
      }),
    { locale: typedLocale },
  );
  const rows = measureDetailSync(
    "admin/assets-inventory.table mapping/formatting",
    () =>
      assets.map((asset) => ({
        id: asset.id,
        searchText: asset.name,
        sortValues: {
          name: asset.name,
          quantity: asset.quantity,
          value: asset.valueCents,
          purchaseDate: asset.purchaseDate,
        },
        cells: {
          name: <p className="font-semibold">{asset.name}</p>,
          quantity: formatNumber(asset.quantity, localeString),
          value: formatCurrency(asset.valueCents, localeString),
          purchaseDate: formatDate(asset.purchaseDate, localeString),
        },
        actions: (
          <AssetInventoryActions
            locale={typedLocale}
            asset={asset}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ),
      })),
    { locale: typedLocale, rows: assets.length },
  );

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto në Inventar" : "Add Asset"}
          buttonLabel={typedLocale === "sq" ? "Shto në Inventar" : "Add Asset"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <CreateActionForm
            action={createAssetInventoryAction.bind(null, typedLocale)}
            className="grid gap-4 md:grid-cols-4"
            submitLabel={typedLocale === "sq" ? "Ruaj" : "Save"}
            cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
            errorMessage={typedLocale === "sq" ? "Inventari nuk u ruajt." : "Asset could not be saved."}
            footerClassName="md:col-span-4"
          >
            <input
              name="name"
              required
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Emri" : "Name"}
            />
            <input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              required
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Sasia" : "Quantity"}
            />
            <input
              name="value"
              type="number"
              min="0"
              step="0.01"
              required
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Vlera" : "Value"}
            />
            <input
              name="purchaseDate"
              type="date"
              required
              defaultValue={dateInputValue()}
              className={inputClassName}
              aria-label={typedLocale === "sq" ? "Data kur është blerë" : "Purchase Date"}
            />
          </CreateActionForm>
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/assets-inventory`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kerko inventar" : "Search assets"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka asete në inventar për këtë kërkim."
              : "No inventory assets match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Emri" : "Name", sortable: true },
            {
              key: "quantity",
              label: typedLocale === "sq" ? "Sasia" : "Quantity",
              sortable: true,
            },
            {
              key: "value",
              label: typedLocale === "sq" ? "Vlera" : "Value",
              sortable: true,
              align: "right",
            },
            {
              key: "purchaseDate",
              label: typedLocale === "sq" ? "Data e blerjes" : "Purchase Date",
              sortable: true,
            },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
}

export default withPagePerf("admin/assets-inventory", AssetsInventoryPage);
