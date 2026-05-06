export const permissionModules = [
  "DASHBOARD",
  "LEADS",
  "CLIENTS",
  "SUPPLIERS",
  "INVENTORY",
  "ASSETS_INVENTORY",
  "STOQET",
  "OFFERS",
  "INVOICES",
  "PURCHASE_INVOICES",
  "DELIVERY_NOTES",
  "EXPENSES",
  "DEBIT_NOTES",
  "REPORTS",
  "WORKER_HOURS",
  "USERS",
  "ROLES",
] as const;

export const permissionActions = [
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "EXPORT",
] as const;

export type PermissionModuleKey = (typeof permissionModules)[number];
export type PermissionActionKey = (typeof permissionActions)[number];
export type PermissionMatrix = Record<
  PermissionModuleKey,
  Record<PermissionActionKey, boolean>
>;

export const permissionModuleLabels = {
  DASHBOARD: { sq: "Dashboard", en: "Dashboard" },
  LEADS: { sq: "Kërkesat", en: "Requests" },
  CLIENTS: { sq: "Klientët", en: "Clients" },
  SUPPLIERS: { sq: "Furnitoret", en: "Suppliers" },
  INVENTORY: { sq: "Artikujt", en: "Items" },
  ASSETS_INVENTORY: { sq: "Inventari", en: "Assets Inventory" },
  STOQET: { sq: "Stoqet", en: "Stocks" },
  OFFERS: { sq: "Ofertat", en: "Offers" },
  INVOICES: { sq: "Faturat e Shitjes", en: "Sales Invoices" },
  PURCHASE_INVOICES: { sq: "Faturat e Blerjes", en: "Purchase Invoices" },
  DELIVERY_NOTES: { sq: "Fletë Dërgesat", en: "Delivery Notes" },
  EXPENSES: { sq: "Shpenzimet", en: "Expenses" },
  DEBIT_NOTES: { sq: "Debit Note", en: "Debit Note" },
  REPORTS: { sq: "Raportet", en: "Reports" },
  WORKER_HOURS: { sq: "Orët e Punëtorëve", en: "Worker Hours" },
  USERS: { sq: "Përdoruesit", en: "Users" },
  ROLES: { sq: "Rolet & Lejet", en: "Roles & Permissions" },
} as const satisfies Record<PermissionModuleKey, { sq: string; en: string }>;

export const permissionActionLabels = {
  VIEW: { sq: "Shiko", en: "View" },
  CREATE: { sq: "Krijo", en: "Create" },
  EDIT: { sq: "Ndrysho", en: "Edit" },
  DELETE: { sq: "Fshi", en: "Delete" },
  EXPORT: { sq: "Eksporto / PDF", en: "Export / PDF" },
} as const satisfies Record<PermissionActionKey, { sq: string; en: string }>;

export const adminModulePaths = {
  DASHBOARD: "/admin",
  LEADS: "/admin/leads",
  CLIENTS: "/admin/clients",
  SUPPLIERS: "/admin/suppliers",
  INVENTORY: "/admin/inventory",
  ASSETS_INVENTORY: "/admin/assets-inventory",
  STOQET: "/admin/stoqet",
  OFFERS: "/admin/offers",
  INVOICES: "/admin/invoices",
  PURCHASE_INVOICES: "/admin/purchase-invoices",
  DELIVERY_NOTES: "/admin/delivery-notes",
  EXPENSES: "/admin/expenses",
  DEBIT_NOTES: "/admin/debit-notes",
  REPORTS: "/admin/reports",
  WORKER_HOURS: "/admin/worker-hours",
  USERS: "/admin/users",
  ROLES: "/admin/roles",
} as const satisfies Record<PermissionModuleKey, string>;

export const roleLabels = {
  OWNER: { sq: "Owner / Super Admin", en: "Owner / Super Admin" },
  MANAGER: { sq: "Admin", en: "Admin" },
  STAFF: { sq: "Staff / Employee", en: "Staff / Employee" },
} as const;

export const systemRoleDefinitions = {
  OWNER: {
    key: "OWNER",
    name: "Owner / Super Admin",
    description: "Full system access. This role is protected and cannot lose permissions.",
  },
  MANAGER: {
    key: "MANAGER",
    name: "Admin",
    description: "Strong business permissions for daily ERP administration.",
  },
  STAFF: {
    key: "STAFF",
    name: "Staff / Employee",
    description: "Limited access controlled by the owner.",
  },
} as const;
