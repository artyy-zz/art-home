import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "tonal" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-foreground)] text-white hover:bg-black shadow-[0_14px_34px_rgba(18,16,14,0.18)]",
  secondary:
    "border border-[var(--color-line-strong)] bg-white/80 text-[var(--color-foreground)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
  ghost:
    "text-[var(--color-foreground)] hover:bg-black/5",
  tonal:
    "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] hover:bg-[rgba(150,114,79,0.18)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-6 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(150,114,79,0.22)] disabled:pointer-events-none disabled:opacity-60",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={buttonClasses({
        variant,
        size,
        className,
      })}
      {...props}
    />
  );
}
