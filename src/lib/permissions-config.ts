export const permissionModules = [
  "DASHBOARD",
  "LEADS",
  "CLIENTS",
  "INVENTORY",
  "OFFERS",
  "INVOICES",
  "REPORTS",
  "USERS",
  "ROLES",
  "SETTINGS",
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
  INVENTORY: { sq: "Inventari", en: "Inventory" },
  OFFERS: { sq: "Ofertat", en: "Offers" },
  INVOICES: { sq: "Faturat", en: "Invoices" },
  REPORTS: { sq: "Raportet", en: "Reports" },
  USERS: { sq: "Përdoruesit", en: "Users" },
  ROLES: { sq: "Rolet & Lejet", en: "Roles & Permissions" },
  SETTINGS: { sq: "Cilësimet", en: "Settings" },
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
  INVENTORY: "/admin/inventory",
  OFFERS: "/admin/offers",
  INVOICES: "/admin/invoices",
  REPORTS: "/admin/reports",
  USERS: "/admin/users",
  ROLES: "/admin/roles",
  SETTINGS: "/admin/settings",
} as const satisfies Record<PermissionModuleKey, string>;

export const roleLabels = {
  OWNER: { sq: "Owner / Super Admin", en: "Owner / Super Admin" },
  MANAGER: { sq: "Manager / Admin", en: "Manager / Admin" },
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
    name: "Manager / Admin",
    description: "Strong business permissions for daily ERP administration.",
  },
  STAFF: {
    key: "STAFF",
    name: "Staff / Employee",
    description: "Limited access controlled by the owner.",
  },
} as const;
