"use client";

import Link from "next/link";
import useSWR from "swr";
import { buttonClasses } from "@/components/shared/button";
import { DebitNoteBuilderForm } from "@/components/forms/debit-note-builder-form";
import { DeliveryNoteBuilderForm } from "@/components/forms/delivery-note-builder-form";
import { ExpenseBuilderForm } from "@/components/forms/expense-builder-form";
import { InvoiceBuilderForm } from "@/components/forms/invoice-builder-form";
import { OfferBuilderForm } from "@/components/forms/offer-builder-form";
import { PurchaseInvoiceBuilderForm } from "@/components/forms/purchase-invoice-builder-form";
import {
  StockBuilderForm,
  type StockMaterialOption,
} from "@/components/forms/stock-builder-form";
import type { Locale } from "@/lib/i18n";

type Action = (formData: FormData) => void | Promise<void>;

type ClientOption = {
  id: string;
  name: string;
};

type SupplierOption = ClientOption;

type ItemOption = {
  id: string;
  name: string;
  sku: string;
  unit?: string;
  unitPriceCents?: number;
  categoryTitle: string;
};

type SalesOptions = {
  suggestedNumber: string;
  clients: ClientOption[];
  items: Required<Pick<ItemOption, "id" | "name" | "sku" | "unit" | "unitPriceCents" | "categoryTitle">>[];
};

type PurchaseOptions = {
  suggestedNumber?: string;
  suppliers: SupplierOption[];
  items: Required<Pick<ItemOption, "id" | "name" | "sku" | "unit" | "unitPriceCents" | "categoryTitle">>[];
};

type DeliveryOptions = {
  suggestedNumbers: Record<"SALES" | "PURCHASE", string>;
  clients: ClientOption[];
  suppliers: SupplierOption[];
  items: Required<Pick<ItemOption, "id" | "name" | "sku" | "categoryTitle">>[];
};

type DebitNoteOptions = {
  suggestedNumber: string;
  clients: ClientOption[];
  invoices: Array<{
    id: string;
    number: string;
    clientId: string;
    issuedAt: string;
    totalCents: number;
    amountPaidCents: number;
    adjustedOutstandingCents: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      quantity: number;
      remainingQuantity: number;
      unitPriceCents: number;
    }>;
  }>;
};

type StockOptions = {
  materials: StockMaterialOption[];
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load options");
  }
  return response.json() as Promise<T>;
};

function optionsUrl(locale: Locale, resource: string, mode?: "create" | "edit") {
  const params = new URLSearchParams({ locale, resource });
  if (mode) {
    params.set("mode", mode);
  }
  return `/api/admin/options?${params.toString()}`;
}

function OptionSkeleton() {
  return (
    <div className="mt-5 grid gap-3 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5">
      <div className="h-12 rounded-2xl bg-black/5" />
      <div className="h-12 rounded-2xl bg-black/5" />
      <div className="h-24 rounded-2xl bg-black/5" />
    </div>
  );
}

function OptionError({ locale }: { locale: Locale }) {
  return (
    <div className="mt-5 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5 text-sm leading-7 text-[var(--color-muted)]">
      {locale === "sq"
        ? "Opsionet nuk u ngarkuan. Provo perseri."
        : "Options could not be loaded. Try again."}
    </div>
  );
}

function SetupPrompt({
  message,
  href,
  label,
}: {
  message: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5">
      <p className="text-sm leading-7 text-[var(--color-muted)]">{message}</p>
      {href && label ? (
        <Link href={href} className={buttonClasses({ variant: "secondary" })}>
          {label}
        </Link>
      ) : null}
    </div>
  );
}

export function LazyOfferBuilderForm({
  locale,
  action,
}: {
  locale: Locale;
  action: Action;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "offers"),
    fetcher<SalesOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  if (data.clients.length === 0 || data.items.length === 0) {
    const missingClient = data.clients.length === 0;
    return (
      <SetupPrompt
        message={
          missingClient
            ? locale === "sq"
              ? "Shtoni nje klient para se te krijoni oferten e pare."
              : "Add a client before creating the first offer."
            : locale === "sq"
              ? "Shtoni nje artikull para se te krijoni oferten e pare."
              : "Add an item before creating the first offer."
        }
        href={`/${locale}/admin/${missingClient ? "clients" : "inventory"}`}
        label={
          missingClient
            ? locale === "sq"
              ? "Shto klient"
              : "Add client"
            : locale === "sq"
              ? "Shto artikull"
              : "Add item"
        }
      />
    );
  }

  return <OfferBuilderForm locale={locale} clients={data.clients} items={data.items} action={action} />;
}

export function LazyInvoiceBuilderForm({
  locale,
  action,
}: {
  locale: Locale;
  action: Action;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "invoices"),
    fetcher<SalesOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  if (data.clients.length === 0 || data.items.length === 0) {
    const missingClient = data.clients.length === 0;
    return (
      <SetupPrompt
        message={
          missingClient
            ? locale === "sq"
              ? "Shtoni nje klient para se te krijoni faturen e pare."
              : "Add a client before creating the first invoice."
            : locale === "sq"
              ? "Shtoni nje artikull para se te krijoni faturen e pare."
              : "Add an item before creating the first invoice."
        }
        href={`/${locale}/admin/${missingClient ? "clients" : "inventory"}`}
        label={
          missingClient
            ? locale === "sq"
              ? "Shto klient"
              : "Add client"
            : locale === "sq"
              ? "Shto artikull"
              : "Add item"
        }
      />
    );
  }

  return <InvoiceBuilderForm locale={locale} clients={data.clients} items={data.items} action={action} />;
}

export function LazyPurchaseInvoiceBuilderForm({
  locale,
  action,
}: {
  locale: Locale;
  action: Action;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "purchase-invoices"),
    fetcher<PurchaseOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  if (data.suppliers.length === 0 || data.items.length === 0) {
    const missingSupplier = data.suppliers.length === 0;
    return (
      <SetupPrompt
        message={
          locale === "sq"
            ? "Shtoni furnitor dhe artikull ne inventar para se te krijoni faturen e pare te blerjes."
            : "Add a supplier and an inventory item before creating the first purchase invoice."
        }
        href={`/${locale}/admin/${missingSupplier ? "suppliers" : "inventory"}`}
        label={
          missingSupplier
            ? locale === "sq"
              ? "Shto furnitor"
              : "Add supplier"
            : locale === "sq"
              ? "Shko te artikujt"
              : "Go to items"
        }
      />
    );
  }

  return (
    <PurchaseInvoiceBuilderForm
      locale={locale}
      suppliers={data.suppliers}
      items={data.items}
      action={action}
    />
  );
}

export function LazyDeliveryNoteBuilderForm({
  locale,
  action,
}: {
  locale: Locale;
  action: Action;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "delivery-notes"),
    fetcher<DeliveryOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  if (data.clients.length === 0 || data.suppliers.length === 0 || data.items.length === 0) {
    return (
      <SetupPrompt
        message={
          locale === "sq"
            ? "Shtoni klient, furnitor dhe artikull para se te krijoni flete dergesen e pare."
            : "Add a client, supplier, and item before creating the first delivery note."
        }
      />
    );
  }

  return (
    <DeliveryNoteBuilderForm
      locale={locale}
      clients={data.clients}
      suppliers={data.suppliers}
      items={data.items}
      action={action}
    />
  );
}

export function LazyExpenseBuilderForm({
  locale,
  action,
}: {
  locale: Locale;
  action: Action;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "expenses"),
    fetcher<PurchaseOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  return <ExpenseBuilderForm locale={locale} suppliers={data.suppliers} items={data.items} action={action} />;
}

export function LazyDebitNoteBuilderForm({
  locale,
  action,
}: {
  locale: Locale;
  action: Action;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "debit-notes"),
    fetcher<DebitNoteOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  const hasInvoiceItems = data.invoices.some((invoice) =>
    invoice.items.some((item) => item.remainingQuantity > 0),
  );

  if (data.clients.length === 0 || !hasInvoiceItems) {
    return (
      <SetupPrompt
        message={
          locale === "sq"
            ? "Krijoni nje fature shitjeje me artikuj para se te krijoni debit note."
            : "Create a sales invoice with items before creating a debit note."
        }
      />
    );
  }

  return <DebitNoteBuilderForm locale={locale} clients={data.clients} invoices={data.invoices} action={action} />;
}

export function LazyStockBuilderForm({
  locale,
  action,
  mode = "create",
  submitLabel,
  initial,
  onCancel,
}: {
  locale: Locale;
  action: Action;
  mode?: "create" | "edit";
  submitLabel: string;
  initial?: {
    name: string;
    price: string;
    rows: Array<{ materialId: string; quantity: number }>;
  };
  onCancel?: () => void;
}) {
  const { data, error, isLoading } = useSWR(
    optionsUrl(locale, "stoqet", mode),
    fetcher<StockOptions>,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  if (isLoading) return <OptionSkeleton />;
  if (error || !data) return <OptionError locale={locale} />;

  if (data.materials.length === 0) {
    return (
      <p className="rounded-2xl border-[2.25px] border-black/18 bg-white/72 p-4 text-sm text-[var(--color-muted)]">
        {locale === "sq"
          ? "Shto artikuj para se te krijosh stok."
          : "Add items before creating stock."}
      </p>
    );
  }

  return (
    <StockBuilderForm
      locale={locale}
      materials={data.materials}
      action={action}
      submitLabel={submitLabel}
      initial={initial}
      onCancel={onCancel}
    />
  );
}
