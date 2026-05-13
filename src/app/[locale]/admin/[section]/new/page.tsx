import { MaterialType } from "@prisma/client";
import {
  createAssetInventoryAction,
  createClientAction,
  createDebitNoteAction,
  createDeliveryNoteAction,
  createExpenseAction,
  createInvoiceAction,
  createMaterialAction,
  createOfferAction,
  createPurchaseInvoiceAction,
  createStokAction,
  createSupplierAction,
  createUserAction,
  createWorkerAction,
} from "@/actions/admin";
import { CreateActionForm } from "@/components/admin/create-form-panel";
import {
  LazyDebitNoteBuilderForm,
  LazyDeliveryNoteBuilderForm,
  LazyExpenseBuilderForm,
  LazyInvoiceBuilderForm,
  LazyOfferBuilderForm,
  LazyPurchaseInvoiceBuilderForm,
  LazyStockBuilderForm,
} from "@/components/admin/lazy-admin-options";
import { UserCreateForm } from "@/components/forms/user-create-form";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { requirePermission } from "@/lib/permissions";
import type { PermissionModuleKey } from "@/lib/permissions-config";
import { materialTypeLabel } from "@/lib/erp";
import { notFound } from "next/navigation";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

const materialTypeOptions = [
  MaterialType.WOOD,
  MaterialType.HARDWARE,
  MaterialType.COMPONENT,
  MaterialType.FINISH,
  MaterialType.ACCESSORY,
];

const createConfig = {
  clients: { module: "CLIENTS", title: { sq: "Shto klient te ri", en: "Add new client" } },
  suppliers: { module: "SUPPLIERS", title: { sq: "Shto furnitor te ri", en: "Add new supplier" } },
  inventory: { module: "INVENTORY", title: { sq: "Shto artikull", en: "Add item" } },
  stoqet: { module: "STOQET", title: { sq: "Shto Stok", en: "Add Stock" } },
  "assets-inventory": { module: "ASSETS_INVENTORY", title: { sq: "Shto ne Inventar", en: "Add Asset" } },
  offers: { module: "OFFERS", title: { sq: "Krijo oferte", en: "Create offer" } },
  invoices: { module: "INVOICES", title: { sq: "Krijo fature shitjeje", en: "Create sales invoice" } },
  "purchase-invoices": { module: "PURCHASE_INVOICES", title: { sq: "Krijo fature blerjeje", en: "Create purchase invoice" } },
  "delivery-notes": { module: "DELIVERY_NOTES", title: { sq: "Krijo flete dergese", en: "Create delivery note" } },
  expenses: { module: "EXPENSES", title: { sq: "Krijo shpenzim", en: "Create expense" } },
  "debit-notes": { module: "DEBIT_NOTES", title: { sq: "Krijo debit note", en: "Create debit note" } },
  "worker-hours": { module: "WORKER_HOURS", title: { sq: "Shto Punetor", en: "Add Worker" } },
  users: { module: "USERS", title: { sq: "Shto perdorues", en: "Add user" } },
} as const satisfies Record<string, { module: PermissionModuleKey; title: Record<Locale, string> }>;

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function AdminCreatePage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  const typedLocale = locale as Locale;
  const config = createConfig[section as keyof typeof createConfig];

  if (!config) {
    notFound();
  }

  await requirePermission(typedLocale, config.module, "CREATE");

  return (
    <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
      <div className="mb-6">
        <h2 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
          {config.title[typedLocale]}
        </h2>
      </div>
      {section === "clients" ? (
        <CreateActionForm
          action={createClientAction.bind(null, typedLocale)}
          className="grid gap-4 md:grid-cols-3"
          submitLabel={typedLocale === "sq" ? "Ruaj klientin" : "Save client"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
          errorMessage={typedLocale === "sq" ? "Klienti nuk u ruajt." : "Client could not be saved."}
          footerClassName="md:col-span-3"
        >
          <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri i klientit" : "Client name"} />
          <input name="contactPerson" className={inputClassName} placeholder={typedLocale === "sq" ? "Personi kontaktues" : "Contact person"} />
          <input name="nui" className={inputClassName} placeholder="NUI" />
          <input name="email" className={inputClassName} placeholder="Email" />
          <input name="phone" className={inputClassName} placeholder={typedLocale === "sq" ? "Telefoni" : "Phone"} />
          <input name="vatNumber" className={inputClassName} placeholder={typedLocale === "sq" ? "Numri i TVSH" : "VAT number"} />
          <input name="address" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Adresa" : "Address"} />
          <textarea name="notes" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Shenime" : "Notes"} />
        </CreateActionForm>
      ) : null}
      {section === "suppliers" ? (
        <CreateActionForm
          action={createSupplierAction.bind(null, typedLocale)}
          className="grid gap-4 md:grid-cols-3"
          submitLabel={typedLocale === "sq" ? "Ruaj furnitorin" : "Save supplier"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
          errorMessage={typedLocale === "sq" ? "Furnitori nuk u ruajt." : "Supplier could not be saved."}
          footerClassName="md:col-span-3"
        >
          <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri i furnitorit" : "Supplier name"} />
          <input name="contactPerson" className={inputClassName} placeholder={typedLocale === "sq" ? "Personi kontaktues" : "Contact person"} />
          <input name="nui" className={inputClassName} placeholder="NUI" />
          <input name="email" className={inputClassName} placeholder="Email" />
          <input name="phone" className={inputClassName} placeholder={typedLocale === "sq" ? "Telefoni" : "Phone"} />
          <input name="vatNumber" className={inputClassName} placeholder={typedLocale === "sq" ? "Numri i TVSH" : "VAT number"} />
          <input name="address" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Adresa" : "Address"} />
          <textarea name="notes" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Shenime" : "Notes"} />
        </CreateActionForm>
      ) : null}
      {section === "inventory" ? (
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
              <option key={type} value={type}>{materialTypeLabel(type, typedLocale)}</option>
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
          <input name="costPerUnit" type="number" min="0" step="0.01" required className={inputClassName} placeholder={typedLocale === "sq" ? "Cmimi" : "Price"} />
          <textarea name="notes" className={`${inputClassName} md:col-span-2`} placeholder={typedLocale === "sq" ? "Shenime" : "Notes"} />
        </CreateActionForm>
      ) : null}
      {section === "assets-inventory" ? (
        <CreateActionForm
          action={createAssetInventoryAction.bind(null, typedLocale)}
          className="grid gap-4 md:grid-cols-4"
          submitLabel={typedLocale === "sq" ? "Ruaj" : "Save"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
          errorMessage={typedLocale === "sq" ? "Inventari nuk u ruajt." : "Asset could not be saved."}
          footerClassName="md:col-span-4"
        >
          <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri" : "Name"} />
          <input name="quantity" type="number" min="0.01" step="0.01" required className={inputClassName} placeholder={typedLocale === "sq" ? "Sasia" : "Quantity"} />
          <input name="value" type="number" min="0" step="0.01" required className={inputClassName} placeholder={typedLocale === "sq" ? "Vlera" : "Value"} />
          <input name="purchaseDate" type="date" required defaultValue={dateInputValue()} className={inputClassName} aria-label={typedLocale === "sq" ? "Data kur eshte blere" : "Purchase Date"} />
        </CreateActionForm>
      ) : null}
      {section === "worker-hours" ? (
        <CreateActionForm
          action={createWorkerAction.bind(null, typedLocale)}
          className="grid gap-4 md:grid-cols-2"
          submitLabel={typedLocale === "sq" ? "Ruaj" : "Save"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
          errorMessage={typedLocale === "sq" ? "Punetori nuk u ruajt." : "Worker could not be saved."}
          footerClassName="md:col-span-2"
        >
          <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri" : "Name"} />
          <input name="role" required className={inputClassName} placeholder={typedLocale === "sq" ? "Roli" : "Role"} />
        </CreateActionForm>
      ) : null}
      {section === "offers" ? <LazyOfferBuilderForm locale={typedLocale} action={createOfferAction.bind(null, typedLocale)} /> : null}
      {section === "invoices" ? <LazyInvoiceBuilderForm locale={typedLocale} action={createInvoiceAction.bind(null, typedLocale)} /> : null}
      {section === "purchase-invoices" ? <LazyPurchaseInvoiceBuilderForm locale={typedLocale} action={createPurchaseInvoiceAction.bind(null, typedLocale)} /> : null}
      {section === "delivery-notes" ? <LazyDeliveryNoteBuilderForm locale={typedLocale} action={createDeliveryNoteAction.bind(null, typedLocale)} /> : null}
      {section === "expenses" ? <LazyExpenseBuilderForm locale={typedLocale} action={createExpenseAction.bind(null, typedLocale)} /> : null}
      {section === "debit-notes" ? <LazyDebitNoteBuilderForm locale={typedLocale} action={createDebitNoteAction.bind(null, typedLocale)} /> : null}
      {section === "stoqet" ? (
        <LazyStockBuilderForm
          locale={typedLocale}
          action={createStokAction.bind(null, typedLocale)}
          submitLabel={typedLocale === "sq" ? "Ruaj Stokun" : "Save Stock"}
        />
      ) : null}
      {section === "users" ? <UserCreateForm locale={typedLocale} action={createUserAction.bind(null, typedLocale)} /> : null}
    </Card>
  );
}
