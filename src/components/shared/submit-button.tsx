"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/shared/button";

export function SubmitButton({
  children,
  variant = "primary",
  size,
  className,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "tonal" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className}>
      {pending ? "..." : children}
    </Button>
  );
}
