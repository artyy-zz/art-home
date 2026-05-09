"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function PasswordInput({
  name = "password",
  required = true,
  className,
  buttonClassName,
  placeholder,
}: {
  name?: string;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative min-w-0">
      <input
        type={visible ? "text" : "password"}
        name={name}
        required={required}
        placeholder={placeholder}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((value) => !value)}
        className={cn(
          "absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-current/70 transition hover:bg-white/10 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
          buttonClassName,
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    </div>
  );
}
