import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-black/5 text-[var(--color-muted)]",
    accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
    success: "bg-[rgba(33,91,63,0.12)] text-[var(--color-success)]",
    warning: "bg-[rgba(159,111,24,0.12)] text-[var(--color-warning)]",
    danger: "bg-[rgba(140,47,43,0.12)] text-[var(--color-danger)]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
