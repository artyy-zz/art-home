"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { cn } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;
type CloseCreateFormPanel = () => void;

const CreateFormPanelContext = createContext<CloseCreateFormPanel | null>(null);

export function useCreateFormPanel() {
  return useContext(CreateFormPanelContext);
}

export function CreateFormPanel({
  title,
  buttonLabel,
  cancelLabel,
  children,
  className,
}: {
  title: string;
  buttonLabel: string;
  cancelLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const closePanel = () => setIsOpen(false);

  return (
    <Card className={cn("rounded-[28px] p-4 sm:p-5", className)}>
      {isOpen ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={closePanel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
              aria-label={cancelLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <CreateFormPanelContext.Provider value={closePanel}>
            <div id={panelId} className="mt-6">
              {children}
            </div>
          </CreateFormPanelContext.Provider>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={buttonClasses({ className: "gap-2" })}
          aria-expanded={false}
          aria-controls={panelId}
        >
          <Plus className="h-4 w-4" />
          {buttonLabel}
        </button>
      )}
    </Card>
  );
}

function CreateSubmitButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClasses({ className })}
    >
      {pending ? "..." : label}
    </button>
  );
}

export function CreateActionForm({
  action,
  children,
  submitLabel,
  cancelLabel,
  errorMessage,
  className,
  footerClassName,
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel: string;
  cancelLabel: string;
  errorMessage: string;
  className?: string;
  footerClassName?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const closePanel = useCreateFormPanel();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");

    try {
      await action(formData);
      formRef.current?.reset();
      closePanel?.();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : errorMessage);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className={className}>
      {children}
      {error ? (
        <p className="rounded-2xl bg-[rgba(140,47,43,0.09)] px-4 py-3 text-sm text-[var(--color-danger)] md:col-span-full">
          {error}
        </p>
      ) : null}
      <div className={cn("flex flex-wrap justify-end gap-2", footerClassName)}>
        {closePanel ? (
          <button
            type="button"
            onClick={closePanel}
            className={buttonClasses({ variant: "secondary" })}
          >
            {cancelLabel}
          </button>
        ) : null}
        <CreateSubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
