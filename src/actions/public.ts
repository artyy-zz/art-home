"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";
import { leadSchema, quoteRequestSchema } from "@/lib/validators";
import type { ActionState } from "@/actions/auth";
import { NotificationType } from "@prisma/client";

function quoteRequestError(locale: Locale, issuePath?: PropertyKey) {
  if (issuePath === "details") {
    return locale === "sq"
      ? "Shkruani detajet e ofertës."
      : "Offer/request details are required.";
  }

  if (issuePath === "name") {
    return locale === "sq" ? "Emri është i detyrueshëm." : "Name is required.";
  }

  if (issuePath === "email") {
    return locale === "sq"
      ? "Email-i nuk është i vlefshëm."
      : "Email is invalid.";
  }

  if (issuePath === "contact") {
    return locale === "sq"
      ? "Shënoni numrin e telefonit ose email-in."
      : "Enter a phone number or email.";
  }

  return locale === "sq"
    ? "Kontrollo fushat e formës."
    : "Please review the form fields.";
}

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

export async function createQuoteRequestAction(
  locale: Locale,
  _prevState: ActionState | undefined,
  formData: FormData,
) {
  const parsed = quoteRequestSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    details: formData.get("details"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return {
      error: quoteRequestError(locale, firstIssue?.path[0]),
    };
  }

  const quoteRequest = await prisma.quoteRequest.create({
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
          ? "Kërkesë e re për ofertë"
          : "New quote request",
      message:
        locale === "sq"
          ? `${quoteRequest.name} dërgoi një kërkesë të re për ofertë.`
          : `${quoteRequest.name} submitted a new quote request.`,
      href: `/${locale}/admin/leads`,
    },
  });

  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/quote`);
  revalidatePath("/sq/admin/leads");
  revalidatePath("/en/admin/leads");
  revalidatePath("/sq/admin");
  revalidatePath("/en/admin");

  redirect(`/${locale}?quote=sent`);
}
