import type { Metadata } from "next";
import { display, sans } from "@/app/fonts";
import { rootMetadata } from "@/lib/seo";
import "../globals.css";

export const metadata: Metadata = rootMetadata;

export default function RootRedirectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sq"
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${display.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--color-background)] text-[var(--color-foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
