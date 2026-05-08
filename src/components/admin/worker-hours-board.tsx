"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import {
  createWorkerTimeEntryAction,
  deleteWorkerAction,
  deleteWorkerTimeEntryAction,
  updateWorkerAction,
  updateWorkerTimeEntryAction,
} from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";

type WorkerEntry = {
  id: string;
  startedAt: string;
  finishedAt: string;
};

type WorkerAdvance = {
  id: string;
  date: string;
  amountCents: number;
};

type Worker = {
  id: string;
  name: string;
  role: string;
  entries: WorkerEntry[];
  advances: WorkerAdvance[];
};

type WorkerHoursBoardProps = {
  locale: Locale;
  workers: Worker[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";
const smallInputClassName =
  "h-11 rounded-2xl border border-black/10 bg-white/92 px-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.12)]";

function dateInputValue(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeInputValue(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function hoursBetween(startedAt: string, finishedAt: string) {
  return (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 36e5;
}

function formatBoardNumber(value: number, locale: Locale) {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  return locale === "sq" ? rounded.replace(".", ",") : rounded;
}

function formatBoardDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatBoardTime(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sameBoardDate(left: string, right: string) {
  return dateInputValue(left) === dateInputValue(right);
}

function formatMoney(amountCents: number, locale: Locale) {
  const amount = amountCents / 100;
  const formatted = amount.toFixed(2).replace(/\.00$/, "");
  return `${locale === "sq" ? formatted.replace(".", ",") : formatted} EUR`;
}

function WorkerEditModal({
  locale,
  worker,
  onClose,
}: {
  locale: Locale;
  worker: Worker;
  onClose: () => void;
}) {
  async function handleSubmit(formData: FormData) {
    await updateWorkerAction(locale, worker.id, formData);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-xl rounded-[28px] border border-black/10 bg-[#fbf8f4] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
              {locale === "sq" ? "Ndrysho Punëtorin" : "Edit Worker"}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{worker.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
            aria-label={locale === "sq" ? "Mbyll" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            {locale === "sq" ? "Emri" : "Name"}
            <input name="name" required defaultValue={worker.name} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            {locale === "sq" ? "Roli" : "Role"}
            <input name="role" required defaultValue={worker.role} className={inputClassName} />
          </label>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <button type="button" onClick={onClose} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              {locale === "sq" ? "Anulo" : "Cancel"}
            </button>
            <button className={buttonClasses({ size: "sm" })}>
              {locale === "sq" ? "Ruaj" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TimeEntryEditModal({
  locale,
  entry,
  advances,
  onClose,
}: {
  locale: Locale;
  entry: WorkerEntry;
  advances: WorkerAdvance[];
  onClose: () => void;
}) {
  const firstAdvance = advances[0];
  const advanceTotalCents = advances.reduce((sum, advance) => sum + advance.amountCents, 0);
  async function handleSubmit(formData: FormData) {
    await updateWorkerTimeEntryAction(locale, entry.id, formData);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-xl rounded-[28px] border border-black/10 bg-[#fbf8f4] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {locale === "sq" ? "Ndrysho Orarin" : "Edit Time Entry"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-foreground)] transition hover:bg-white"
            aria-label={locale === "sq" ? "Mbyll" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="advanceIds" value={advances.map((advance) => advance.id).join(",")} />
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            {locale === "sq" ? "Data" : "Date"}
            <input name="date" type="date" required defaultValue={dateInputValue(entry.startedAt)} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            {locale === "sq" ? "Fillimi" : "Start"}
            <input name="startTime" type="time" required defaultValue={timeInputValue(entry.startedAt)} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            {locale === "sq" ? "Mbarimi" : "Finish"}
            <input name="finishTime" type="time" required defaultValue={timeInputValue(entry.finishedAt)} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
            {locale === "sq" ? "Avanc" : "Advance"}
            <input
              name="advanceAmount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={firstAdvance ? advanceTotalCents / 100 : ""}
              placeholder={locale === "sq" ? "Lere bosh" : "Leave blank"}
              className={inputClassName}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-4">
            <button type="button" onClick={onClose} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              {locale === "sq" ? "Anulo" : "Cancel"}
            </button>
            <button className={buttonClasses({ size: "sm" })}>
              {locale === "sq" ? "Ruaj" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkerHoursBoard({
  locale,
  workers,
  canCreate,
  canEdit,
  canDelete,
}: WorkerHoursBoardProps) {
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ entry: WorkerEntry; advances: WorkerAdvance[] } | null>(null);

  if (workers.length === 0) {
    return (
      <p className="rounded-2xl border-[2.25px] border-black/18 bg-white/72 p-4 text-sm text-[var(--color-muted)]">
        {locale === "sq" ? "Nuk ka punëtorë ende." : "No workers yet."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {workers.map((worker) => {
        const totalHours = worker.entries.reduce(
          (sum, entry) => sum + hoursBetween(entry.startedAt, entry.finishedAt),
          0,
        );

        return (
          <details
            key={worker.id}
            className="group overflow-hidden rounded-2xl border-[2.25px] border-black/18 bg-white/86 shadow-[0_14px_36px_rgba(18,16,14,0.06)]"
          >
            <summary className="grid cursor-pointer list-none gap-3 p-4 text-left transition hover:bg-white md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center [&::-webkit-details-marker]:hidden">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{worker.name}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{worker.role}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-strong)]">
                  {worker.entries.length} {locale === "sq" ? "hyrje" : "entries"}
                </span>
                <span className="rounded-full bg-[#f4f0ea] px-3 py-1.5 text-xs font-semibold text-[#5a4b40]">
                  {formatBoardNumber(totalHours, locale)} h
                </span>
              </div>
              <ChevronDown className="h-5 w-5 justify-self-end text-[var(--color-muted)] transition group-open:rotate-180" />
            </summary>

            <div className="border-t-[2.25px] border-black/18 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setEditingWorker(worker)}
                      className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}
                    >
                      <Pencil className="h-4 w-4" />
                      {locale === "sq" ? "Ndrysho" : "Edit"}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <form action={deleteWorkerAction.bind(null, locale, worker.id)}>
                      <ConfirmDeleteButton
                        label={locale === "sq" ? "Fshi" : "Delete"}
                        title={locale === "sq" ? "Konfirmo fshirjen" : "Confirm delete"}
                        cancelLabel={locale === "sq" ? "Anulo" : "Cancel"}
                        closeLabel={locale === "sq" ? "Mbyll" : "Close"}
                        message={
                          locale === "sq"
                            ? `A je i sigurt qe deshiron ta fshish punëtorin "${worker.name}" dhe tabelën e tij?`
                            : `Are you sure you want to delete worker "${worker.name}" and their table?`
                        }
                      />
                    </form>
                  ) : null}
                </div>
              </div>

              {canCreate ? (
                <form
                  action={createWorkerTimeEntryAction.bind(null, locale, worker.id)}
                  className="mb-4 grid gap-3 rounded-2xl border-[2.25px] border-black/18 bg-[#f7f2ec] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={dateInputValue()}
                    className={smallInputClassName}
                    aria-label={locale === "sq" ? "Data" : "Date"}
                  />
                  <input
                    name="startTime"
                    type="time"
                    required
                    className={smallInputClassName}
                    aria-label={locale === "sq" ? "Fillimi" : "Start"}
                  />
                  <input
                    name="finishTime"
                    type="time"
                    required
                    className={smallInputClassName}
                    aria-label={locale === "sq" ? "Mbarimi" : "Finish"}
                  />
                  <button className={buttonClasses({ size: "sm", className: "gap-2" })}>
                    <Plus className="h-4 w-4" />
                    {locale === "sq" ? "Shto" : "Add"}
                  </button>
                </form>
              ) : null}

              <div className="overflow-hidden rounded-2xl border-[2.25px] border-black/18 bg-white/80">
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                    <thead className="bg-[#eee5da] text-xs uppercase tracking-[0.16em] text-[#5a4b40]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{locale === "sq" ? "Data" : "Date"}</th>
                        <th className="px-4 py-3 font-semibold">{locale === "sq" ? "Fillimi" : "Start"}</th>
                        <th className="px-4 py-3 font-semibold">{locale === "sq" ? "Mbarimi" : "Finish"}</th>
                        <th className="px-4 py-3 text-right font-semibold">{locale === "sq" ? "Orët" : "Hours"}</th>
                        <th className="px-4 py-3 font-semibold">{locale === "sq" ? "Avancet" : "Advances"}</th>
                        <th className="px-4 py-3 text-right font-semibold">{locale === "sq" ? "Veprime" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-[2.25px] divide-black/18">
                      {worker.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                            {locale === "sq" ? "Nuk ka orare për këtë punëtor." : "No time entries for this worker."}
                          </td>
                        </tr>
                      ) : (
                        worker.entries.map((entry) => {
                          const entryAdvances = worker.advances.filter((advance) =>
                            sameBoardDate(advance.date, entry.startedAt),
                          );

                          return (
                          <tr key={entry.id} className="bg-white/55 align-top transition hover:bg-white">
                            <td className="px-4 py-3 text-[var(--color-foreground)]">
                              {formatBoardDate(entry.startedAt)}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-foreground)]">
                              {formatBoardTime(entry.startedAt)}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-foreground)]">
                              {formatBoardTime(entry.finishedAt)}
                            </td>
                            <td className="px-4 py-3 text-right text-[var(--color-foreground)]">
                              {formatBoardNumber(hoursBetween(entry.startedAt, entry.finishedAt), locale)} h
                            </td>
                            <td className="px-4 py-3 text-[var(--color-foreground)]">
                              {entryAdvances.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {entryAdvances.map((advance) => (
                                    <span
                                      key={advance.id}
                                      className="inline-flex items-center gap-2 rounded-full bg-[#f4f0ea] px-3 py-1.5 text-xs font-semibold text-[#5a4b40]"
                                    >
                                      {formatMoney(advance.amountCents, locale)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[var(--color-muted)]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditingEntry({ entry, advances: entryAdvances })}
                                    className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    {locale === "sq" ? "Ndrysho" : "Edit"}
                                  </button>
                                ) : null}
                                {canDelete ? (
                                  <form action={deleteWorkerTimeEntryAction.bind(null, locale, entry.id)}>
                                    <ConfirmDeleteButton
                                      label={locale === "sq" ? "Fshi" : "Delete"}
                                      title={locale === "sq" ? "Konfirmo fshirjen" : "Confirm delete"}
                                      cancelLabel={locale === "sq" ? "Anulo" : "Cancel"}
                                      closeLabel={locale === "sq" ? "Mbyll" : "Close"}
                                      message={
                                        locale === "sq"
                                          ? "A je i sigurt qe deshiron ta fshish këtë orar?"
                                          : "Are you sure you want to delete this time entry?"
                                      }
                                    />
                                  </form>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </details>
        );
      })}

      {editingWorker ? (
        <WorkerEditModal
          locale={locale}
          worker={editingWorker}
          onClose={() => setEditingWorker(null)}
        />
      ) : null}
      {editingEntry ? (
        <TimeEntryEditModal
          locale={locale}
          entry={editingEntry.entry}
          advances={editingEntry.advances}
          onClose={() => setEditingEntry(null)}
        />
      ) : null}
    </div>
  );
}
