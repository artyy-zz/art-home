"use client";

type QuoteRequestStatus = "NEW" | "REVIEWED" | "COMPLETED";

export function QuoteRequestStatusSelect({
  action,
  labels,
  status,
}: {
  action: (formData: FormData) => void | Promise<void>;
  labels: Record<QuoteRequestStatus, string>;
  status: QuoteRequestStatus;
}) {
  return (
    <form action={action} className="inline-flex max-w-full">
      <select
        name="status"
        defaultValue={status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="min-h-10 max-w-[190px] rounded-full border border-black/10 bg-white/90 px-3 py-2 pl-4 pr-8 text-xs font-medium text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]"
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
