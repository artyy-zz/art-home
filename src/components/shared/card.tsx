import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  tone = "light",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className={cn(tone === "dark" ? "panel-card" : "surface-card", "rounded-[28px]", className)}>
      {children}
    </div>
  );
}
