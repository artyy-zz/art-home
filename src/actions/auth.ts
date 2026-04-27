"use server";

import { redirect } from "next/navigation";
import { authenticateUser, clearSession, createSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { loginSchema } from "@/lib/validators";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function loginAction(
  locale: Locale,
  _prevState: ActionState | undefined,
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid credentials.",
    };
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return {
      error: locale === "sq" ? "Email ose fjalekalim i pasakte." : "Invalid email or password.",
    };
  }

  await createSession({
    sub: user.id,
    role: user.role,
    roleId: user.roleId,
    name: user.name,
    email: user.email,
  });

  redirect(`/${locale}/admin`);
}

export async function logoutAction(locale: Locale) {
  await clearSession();
  redirect(`/${locale}`);
}
