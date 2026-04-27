"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "tonal" | "danger";
  size?: "sm" | "md" | "lg";
  messageClassName?: string;
};

export function ComingSoonButton({
  children,
  messageClassName = "text-[var(--color-accent-strong)]",
  onClick,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <Button
        type="button"
        onClick={(event) => {
          setVisible(true);
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </Button>
      {visible ? (
        <span className={`text-sm font-semibold ${messageClassName}`}>
          Coming Soon...
        </span>
      ) : null}
    </span>
  );
}
