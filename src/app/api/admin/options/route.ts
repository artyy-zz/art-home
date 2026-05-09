import { NextRequest, NextResponse } from "next/server";
import {
  getDebitNoteBuilderOptions,
  getDeliveryNoteBuilderOptions,
  getInvoiceBuilderOptions,
  getOfferBuilderOptions,
  getPurchaseInvoiceBuilderOptions,
} from "@/lib/erp";
import { isLocale } from "@/lib/i18n";
import { measureDetailAsync } from "@/lib/perf";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  PermissionActionKey,
  PermissionModuleKey,
} from "@/lib/permissions-config";

const optionPermissions: Record<
  string,
  { module: PermissionModuleKey; action: PermissionActionKey }
> = {
  offers: { module: "OFFERS", action: "CREATE" },
  invoices: { module: "INVOICES", action: "CREATE" },
  "purchase-invoices": { module: "PURCHASE_INVOICES", action: "CREATE" },
  "delivery-notes": { module: "DELIVERY_NOTES", action: "CREATE" },
  expenses: { module: "EXPENSES", action: "CREATE" },
  "debit-notes": { module: "DEBIT_NOTES", action: "CREATE" },
};

async function getStockOptions(locale: "sq" | "en", action: PermissionActionKey) {
  await requirePermission(locale, "STOQET", action);

  const materials = await measureDetailAsync(
    "admin/stoqet.options query",
    () =>
      prisma.material.findMany({
        orderBy: [{ name: "asc" }, { sku: "asc" }],
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          stockQuantity: true,
        },
      }),
    { locale, action },
  );

  return { materials };
}

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "";
  if (!isLocale(localeParam)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const resource = request.nextUrl.searchParams.get("resource") ?? "";
  const permission = optionPermissions[resource];

  if (permission) {
    await requirePermission(localeParam, permission.module, permission.action);
  }

  if (resource === "offers") {
    return NextResponse.json(await getOfferBuilderOptions(localeParam));
  }

  if (resource === "invoices") {
    return NextResponse.json(await getInvoiceBuilderOptions(localeParam));
  }

  if (resource === "purchase-invoices") {
    return NextResponse.json(await getPurchaseInvoiceBuilderOptions(localeParam));
  }

  if (resource === "delivery-notes") {
    return NextResponse.json(await getDeliveryNoteBuilderOptions(localeParam));
  }

  if (resource === "expenses") {
    return NextResponse.json(
      await getPurchaseInvoiceBuilderOptions(localeParam, "admin/expenses"),
    );
  }

  if (resource === "debit-notes") {
    return NextResponse.json(await getDebitNoteBuilderOptions());
  }

  if (resource === "stoqet") {
    const mode = request.nextUrl.searchParams.get("mode") === "edit" ? "EDIT" : "CREATE";
    return NextResponse.json(await getStockOptions(localeParam, mode));
  }

  return NextResponse.json({ error: "Unknown option resource" }, { status: 404 });
}
