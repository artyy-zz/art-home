"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { buttonClasses } from "@/components/shared/button";

type ConfirmDeleteButtonProps = {
  label: string;
  message: string;
  className?: string;
  title?: string;
  cancelLabel?: string;
  closeLabel?: string;
};

export function ConfirmDeleteButton({
  label,
  message,
  className,
  title = "Konfirmo fshirjen",
  cancelLabel = "Anulo",
  closeLabel = "Mbyll",
}: ConfirmDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={buttonClasses({
          variant: "danger",
          size: "sm",
          className,
        })}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-md rounded-[28px] border border-black/10 bg-[#fbf8f4] p-5 text-left shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                  {message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
                aria-label={closeLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                className={buttonClasses({ variant: "danger", size: "sm", className: "gap-2" })}
              >
                <Trash2 className="h-4 w-4" />
                {label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
