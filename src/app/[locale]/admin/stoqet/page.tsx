import { withPagePerf } from "@/lib/perf";
import { createStokAction } from "@/actions/admin";
import { StockActions } from "@/components/admin/stock-actions";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { LazyStockBuilderForm } from "@/components/admin/lazy-admin-options";
import { RecordTable } from "@/components/admin/record-table";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { measureDetailAsync, measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatNumber } from "@/lib/utils";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function StoqetPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/stoqet">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "STOQET", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "name";
  const direction = param(resolvedSearchParams, "dir") === "desc" ? "desc" : "asc";
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "STOQET", "CREATE");
  const canEdit = can(permissions, "STOQET", "EDIT");
  const canDelete = can(permissions, "STOQET", "DELETE");

  const stocks = await measureDetailAsync(
    "admin/stoqet.main data query",
    () =>
      prisma.stok.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: {
          items: {
            orderBy: [{ createdAt: "asc" }],
            include: {
              material: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  stockQuantity: true,
                },
              },
            },
          },
        },
      }),
    { locale: typedLocale },
  );
  const rows = measureDetailSync(
    "admin/stoqet.table mapping/formatting",
    () =>
      stocks.map((stock) => {
        const itemSummary = stock.items
          .slice(0, 3)
          .map((item) => item.material.name)
          .join(", ");

        return {
          id: stock.id,
          searchText: `${stock.name} ${stock.items
            .map((item) => `${item.material.name} ${item.material.sku}`)
            .join(" ")}`,
          sortValues: {
            name: stock.name,
            price: stock.priceCents,
            items: stock.items.length,
          },
          cells: {
            name: <p className="font-semibold">{stock.name}</p>,
            price: formatCurrency(stock.priceCents, localeString),
            items: (
              <div>
                <p className="font-semibold">
                  {stock.items.length}{" "}
                  {typedLocale === "sq"
                    ? stock.items.length === 1
                      ? "artikull"
                      : "artikuj"
                    : stock.items.length === 1
                      ? "item"
                      : "items"}
                </p>
                <p className="mt-1 max-w-[360px] text-xs text-[var(--color-muted)]">
                  {itemSummary ||
                    (typedLocale === "sq" ? "Pa artikuj" : "No items")}
                </p>
                {stock.items.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {stock.items
                      .slice(0, 2)
                      .map(
                        (item) =>
                          `${formatNumber(item.quantity, localeString)} ${item.material.unit}`,
                      )
                      .join(" / ")}
                  </p>
                ) : null}
              </div>
            ),
          },
          actions: (
            <StockActions
              locale={typedLocale}
              stock={stock}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ),
        };
      }),
    { locale: typedLocale, rows: stocks.length },
  );

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto Stok" : "Add Stock"}
          buttonLabel={typedLocale === "sq" ? "Shto Stok" : "Add Stock"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <div>
            <LazyStockBuilderForm
              locale={typedLocale}
              action={createStokAction.bind(null, typedLocale)}
              submitLabel={typedLocale === "sq" ? "Ruaj Stokun" : "Save Stock"}
            />
          </div>
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/stoqet`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kerko stok ose artikull" : "Search stock or item"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka stoqe per kete kerkim."
              : "No stocks match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Emri" : "Name", sortable: true },
            {
              key: "price",
              label: typedLocale === "sq" ? "Çmimi" : "Price",
              sortable: true,
              align: "right",
            },
            {
              key: "items",
              label: typedLocale === "sq" ? "Artikujt" : "Items",
              sortable: true,
            },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
}

export default withPagePerf("admin/stoqet", StoqetPage);
