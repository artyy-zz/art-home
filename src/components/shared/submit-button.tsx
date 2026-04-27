"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/shared/button";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "tonal" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending ? "..." : children}
    </Button>
  );
}
