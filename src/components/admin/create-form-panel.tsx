"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/shared/button";
import { cn } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;
type CloseCreateFormPanel = () => void;

const CreateFormPanelContext = createContext<CloseCreateFormPanel | null>(null);

export function useCreateFormPanel() {
  return useContext(CreateFormPanelContext);
}

export function CreateFormPanel({
}: {
  title: string;
  buttonLabel: string;
  cancelLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return null;
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
      <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end", footerClassName)}>
        {closePanel ? (
          <button
            type="button"
            onClick={closePanel}
            className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            {cancelLabel}
          </button>
        ) : null}
        <CreateSubmitButton label={submitLabel} className="w-full sm:w-auto" />
      </div>
    </form>
  );
}
