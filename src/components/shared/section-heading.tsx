import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";

export function SectionHeading({
  label,
  title,
  description,
  align = "left",
  headingLevel = 2,
}: {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  headingLevel?: 1 | 2;
}) {
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";

  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {label ? <Badge tone="accent">{label}</Badge> : null}
      <HeadingTag className="mt-4 break-words font-display text-3xl leading-none tracking-tight text-[var(--color-foreground)] sm:text-4xl md:text-5xl">
        {title}
      </HeadingTag>
      {description ? (
        <p className="mt-4 text-base leading-7 text-[var(--color-muted)] md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
