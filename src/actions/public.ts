"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";
import { leadSchema } from "@/lib/validators";
import type { ActionState } from "@/actions/auth";
import { NotificationType } from "@prisma/client";

export async function createLeadAction(
  locale: Locale,
  _prevState: ActionState | undefined,
  formData: FormData,
) {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        (locale === "sq" ? "Kontrollo fushat e formes." : "Please review the form fields."),
    };
  }

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      sourceLocale: locale,
    },
  });

  await prisma.notification.create({
    data: {
      type: NotificationType.LEAD,
      title:
        locale === "sq"
          ? "Lead i ri nga faqja publike"
          : "New lead from the public website",
      message:
        locale === "sq"
          ? `${lead.name} ka derguar nje kerkese te re per oferte.`
          : `${lead.name} submitted a new quote request.`,
      href: `/${locale}/admin/leads`,
    },
  });

  revalidatePath(`/${locale}/contact`);
  revalidatePath("/sq/admin/leads");
  revalidatePath("/en/admin/leads");
  revalidatePath("/sq/admin");
  revalidatePath("/en/admin");

  return {
    success:
      locale === "sq"
        ? "Kerkesa u regjistrua me sukses. Do t'ju kontaktojme shpejt."
        : "Your request has been recorded successfully. We will contact you shortly.",
  };
}
