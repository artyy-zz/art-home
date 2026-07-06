import "server-only";

import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";
import { measureAsync } from "@/lib/perf";

const SESSION_COOKIE = "arthome_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  role: UserRole;
  roleId?: string | null;
  name: string;
  username: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function authenticateUser(username: string, password: string) {
  const usernameNormalized = normalizeUsername(username);
  const user = await measureAsync(
    "auth.authenticate.userLookup",
    () =>
      prisma.user.findUnique({
        where: { usernameNormalized },
      }),
    { username: usernameNormalized },
  );

  if (!user) {
    return null;
  }

  const matches = await measureAsync("auth.authenticate.bcryptCompare", () =>
    bcrypt.compare(password, user.passwordHash),
  );
  if (!matches) {
    return null;
  }

  await measureAsync(
    "auth.authenticate.lastLoginUpdate",
    () =>
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    { userId: user.id },
  );

  return user;
}

export async function createSession(payload: SessionPayload) {
  const token = await measureAsync("auth.createSession.signJwt", () =>
    signSession(payload),
  );
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  return measureAsync("auth.session.lookup", async () => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(token, getSessionSecret());
      return payload as SessionPayload;
    } catch {
      return null;
    }
  });
});

export const getCurrentUser = cache(async () => {
  return measureAsync("auth.currentUser.lookup", async () => {
    const session = await getSession();
    if (!session?.sub) {
      return null;
    }

    if (session.role === "OWNER") {
      const databaseUser = await prisma.user.findUnique({
        where: { id: session.sub },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          roleId: true,
          roleRecord: {
            select: {
              id: true,
              key: true,
              name: true,
              isOwner: true,
              isSystem: true,
            },
          },
          lastLoginAt: true,
        },
      });

      if (databaseUser) {
        return databaseUser;
      }

      return {
        id: session.sub,
        name: session.name,
        username: session.username ?? session.name,
        role: session.role,
        roleId: session.roleId ?? null,
        roleRecord: {
          id: session.roleId ?? "session-owner-role",
          key: "OWNER",
          name: "Owner",
          isOwner: true,
          isSystem: true,
        },
        lastLoginAt: null,
      };
    }

    return prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        roleId: true,
        roleRecord: {
          select: {
            id: true,
            key: true,
            name: true,
            isOwner: true,
            isSystem: true,
          },
        },
        lastLoginAt: true,
      },
    });
  });
});

export async function requireStaffSession(locale: Locale) {
  const user = await measureAsync(
    "auth.requireStaffSession",
    () => getCurrentUser(),
    { locale },
  );
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return user;
}

export async function requireAdminSession(locale: Locale) {
  const user = await measureAsync(
    "auth.requireAdminSession",
    () => requireStaffSession(locale),
    { locale },
  );
  if (user.role !== "OWNER" && user.role !== "MANAGER" && user.role !== "STAFF") {
    redirect(`/${locale}/login`);
  }

  return user;
}
