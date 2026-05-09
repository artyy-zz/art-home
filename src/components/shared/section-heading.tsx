import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";

export function SectionHeading({
  label,
  title,
  description,
  align = "left",
}: {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {label ? <Badge tone="accent">{label}</Badge> : null}
      <h2 className="mt-4 break-words font-display text-3xl leading-none tracking-tight text-[var(--color-foreground)] sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-[var(--color-muted)] md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
