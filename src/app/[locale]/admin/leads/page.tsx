import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default async function LeadsPage({
  params,
}: PageProps<"/[locale]/admin/leads">) {
  const { locale } = await params;
  redirect(`/${locale as Locale}/admin`);
}
