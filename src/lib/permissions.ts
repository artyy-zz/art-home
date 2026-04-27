import "server-only";

import type { Role, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  permissionActions,
  permissionModules,
  systemRoleDefinitions,
  type PermissionActionKey,
  type PermissionMatrix,
  type PermissionModuleKey,
} from "@/lib/permissions-config";

type RoleRecord = Pick<Role, "id" | "key" | "name" | "isOwner" | "isSystem">;

type PermissionUser = {
  id: string;
  role: UserRole;
  roleId: string | null;
  roleRecord?: RoleRecord | null;
};

export function unauthorizedMessage(locale: Locale) {
  return locale === "sq"
    ? "Nuk keni leje për këtë veprim."
    : "You do not have permission for this action.";
}

function createEmptyMatrix() {
  return Object.fromEntries(
    permissionModules.map((module) => [
      module,
      Object.fromEntries(permissionActions.map((action) => [action, false])),
    ]),
  ) as PermissionMatrix;
}

function createFullMatrix() {
  return Object.fromEntries(
    permissionModules.map((module) => [
      module,
      Object.fromEntries(permissionActions.map((action) => [action, true])),
    ]),
  ) as PermissionMatrix;
}

function allow(
  matrix: PermissionMatrix,
  module: PermissionModuleKey,
  actions: PermissionActionKey[],
) {
  for (const action of actions) {
    matrix[module][action] = true;
  }
}

function asSystemRole(value: string | null | undefined) {
  if (value === "OWNER" || value === "MANAGER" || value === "STAFF") {
    return value;
  }

  return null;
}

export function isOwnerUser(user: Pick<PermissionUser, "role" | "roleRecord">) {
  return user.role === "OWNER" || Boolean(user.roleRecord?.isOwner);
}

export async function ensureSystemRoles() {
  const roles = await Promise.all(
    Object.entries(systemRoleDefinitions).map(([role, definition]) =>
      prisma.role.upsert({
        where: { key: definition.key },
        update: {
          name: definition.name,
          description: definition.description,
          isSystem: true,
          isOwner: role === "OWNER",
        },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          isSystem: true,
          isOwner: role === "OWNER",
        },
      }),
    ),
  );

  const roleByKey = new Map(roles.map((role) => [role.key, role]));
  await Promise.all(
    (["OWNER", "MANAGER", "STAFF"] as UserRole[]).map((role) => {
      const roleRecord = roleByKey.get(role);
      if (!roleRecord) {
        return null;
      }

      return prisma.user.updateMany({
        where: {
          role,
          roleId: null,
        },
        data: {
          roleId: roleRecord.id,
        },
      });
    }),
  );

  return roles;
}

export function getDefaultPermissionMatrix(role: UserRole | null | undefined) {
  if (role === "OWNER") {
    return createFullMatrix();
  }

  const matrix = createEmptyMatrix();

  if (role === "MANAGER") {
    allow(matrix, "DASHBOARD", ["VIEW", "EXPORT"]);
    allow(matrix, "LEADS", ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]);
    allow(matrix, "CLIENTS", ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]);
    allow(matrix, "INVENTORY", ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]);
    allow(matrix, "OFFERS", ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]);
    allow(matrix, "INVOICES", ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]);
    allow(matrix, "REPORTS", ["VIEW", "EXPORT"]);
    allow(matrix, "SETTINGS", ["VIEW"]);
    return matrix;
  }

  if (role === "STAFF") {
    allow(matrix, "DASHBOARD", ["VIEW"]);
  }

  return matrix;
}

export async function getPermissionMatrixForRoleRecord(role: RoleRecord) {
  if (role.isOwner) {
    return createFullMatrix();
  }

  const matrix = getDefaultPermissionMatrix(asSystemRole(role.key));
  const storedPermissions = await prisma.rolePermission.findMany({
    where: { roleId: role.id },
  });

  for (const permission of storedPermissions) {
    matrix[permission.module][permission.action] = permission.allowed;
  }

  return matrix;
}

export async function getPermissionMatrixForRole(role: UserRole) {
  await ensureSystemRoles();
  const roleRecord = await prisma.role.findUnique({
    where: { key: role },
    select: { id: true, key: true, name: true, isOwner: true, isSystem: true },
  });

  if (roleRecord) {
    return getPermissionMatrixForRoleRecord(roleRecord);
  }

  return getDefaultPermissionMatrix(role);
}

export async function getUserPermissionMatrix(user: PermissionUser) {
  if (isOwnerUser(user)) {
    return createFullMatrix();
  }

  if (user.roleRecord) {
    return getPermissionMatrixForRoleRecord(user.roleRecord);
  }

  if (user.roleId) {
    const roleRecord = await prisma.role.findUnique({
      where: { id: user.roleId },
      select: { id: true, key: true, name: true, isOwner: true, isSystem: true },
    });

    if (roleRecord) {
      return getPermissionMatrixForRoleRecord(roleRecord);
    }
  }

  return getPermissionMatrixForRole(user.role);
}

export function can(
  permissions: PermissionMatrix,
  module: PermissionModuleKey,
  action: PermissionActionKey,
) {
  return Boolean(permissions[module]?.[action]);
}

export async function userCan(
  user: PermissionUser,
  module: PermissionModuleKey,
  action: PermissionActionKey,
) {
  const permissions = await getUserPermissionMatrix(user);
  return can(permissions, module, action);
}

export async function requirePermission(
  locale: Locale,
  module: PermissionModuleKey,
  action: PermissionActionKey,
) {
  const user = await requireStaffSession(locale);
  const permissions = await getUserPermissionMatrix(user);
  const allowed = can(permissions, module, action);

  if (!allowed) {
    redirect(`/${locale}/admin/unauthorized`);
  }

  return user;
}

export async function requireOwner(locale: Locale) {
  const user = await requireStaffSession(locale);

  if (!isOwnerUser(user)) {
    redirect(`/${locale}/admin/unauthorized`);
  }

  return user;
}

export async function assertPermission(
  locale: Locale,
  module: PermissionModuleKey,
  action: PermissionActionKey,
) {
  const user = await requireStaffSession(locale);
  const allowed = await userCan(user, module, action);

  if (!allowed) {
    throw new Error(unauthorizedMessage(locale));
  }

  return user;
}

export async function assertOwner(locale: Locale) {
  const user = await requireStaffSession(locale);

  if (!isOwnerUser(user)) {
    throw new Error(unauthorizedMessage(locale));
  }

  return user;
}

export function visibleModulesFromMatrix(permissions: PermissionMatrix) {
  return permissionModules.filter((module) => can(permissions, module, "VIEW"));
}

export async function getAssignableRoles() {
  await ensureSystemRoles();

  return prisma.role.findMany({
    orderBy: [{ isOwner: "desc" }, { isSystem: "desc" }, { name: "asc" }],
  });
}
