"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SortValue = string | number | Date | null | undefined;

type Column = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  align?: "left" | "right";
};

type Row = {
  id: string;
  cells: Record<string, ReactNode>;
  searchText: string;
  sortValues?: Record<string, SortValue>;
  actions?: ReactNode;
};

type Pagination = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  label: string;
  previousLabel: string;
  nextLabel: string;
};

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase();
}

function normalizeSortValue(value: SortValue) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    return value.toLocaleLowerCase();
  }

  return value ?? "";
}

function buildSortHref({
  currentPath,
  preservedParams,
  query,
  sort,
  direction,
  target,
}: {
  currentPath: string;
  preservedParams?: Record<string, string>;
  query: string;
  sort?: string;
  direction: "asc" | "desc";
  target: string;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preservedParams ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }
  if (query) {
    params.set("q", query);
  }
  params.set("sort", target);
  params.set("dir", sort === target && direction === "asc" ? "desc" : "asc");
  return `${currentPath}?${params.toString()}`;
}

function buildPageHref({
  currentPath,
  preservedParams,
  query,
  sort,
  direction,
  page,
}: {
  currentPath: string;
  preservedParams?: Record<string, string>;
  query: string;
  sort?: string;
  direction: "asc" | "desc";
  page: number;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preservedParams ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }
  if (query) {
    params.set("q", query);
  }
  if (sort) {
    params.set("sort", sort);
  }
  params.set("dir", direction);
  params.set("page", String(page));
  return `${currentPath}?${params.toString()}`;
}

export function RecordTable({
  columns,
  rows,
  currentPath,
  preservedParams,
  query,
  sort,
  direction,
  searchPlaceholder,
  searchLabel,
  emptyMessage,
  actionsLabel,
  serverControlled = false,
  pagination,
}: {
  columns: Column[];
  rows: Row[];
  currentPath: string;
  preservedParams?: Record<string, string>;
  query: string;
  sort?: string;
  direction: "asc" | "desc";
  searchPlaceholder: string;
  searchLabel: string;
  emptyMessage: string;
  actionsLabel?: string;
  serverControlled?: boolean;
  pagination?: Pagination;
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const normalizedQuery = normalizeSearch(query.trim());
  const filteredRows = !serverControlled && normalizedQuery
    ? rows.filter((row) => normalizeSearch(row.searchText).includes(normalizedQuery))
    : rows;

  const sortedRows =
    !serverControlled && sort && columns.some((column) => column.key === sort && column.sortable)
      ? [...filteredRows].sort((left, right) => {
          const leftValue = normalizeSortValue(left.sortValues?.[sort]);
          const rightValue = normalizeSortValue(right.sortValues?.[sort]);
          const comparison =
            typeof leftValue === "number" && typeof rightValue === "number"
              ? leftValue - rightValue
              : String(leftValue).localeCompare(String(rightValue));
          return direction === "asc" ? comparison : comparison * -1;
        })
      : filteredRows;
  const showActions = Boolean(actionsLabel && selectionMode);
  const selectLabel = searchLabel === "Search" ? "Select" : "Selekto";
  const cancelSelectLabel = searchLabel === "Search" ? "Cancel" : "Anulo";

  return (
    <div className="space-y-4">
      <form action={currentPath} className="flex flex-col gap-3 sm:flex-row">
        {Object.entries(preservedParams ?? {}).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            name="q"
            defaultValue={query}
            placeholder={searchPlaceholder}
            className="h-12 w-full rounded-full border border-black/10 bg-white/90 pl-11 pr-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.16)]"
          />
        </label>
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        <input type="hidden" name="dir" value={direction} />
        <button className="h-12 rounded-full bg-[var(--color-foreground)] px-5 text-sm font-medium text-white transition hover:bg-black">
          {searchLabel}
        </button>
        {actionsLabel ? (
          <button
            type="button"
            onClick={() => setSelectionMode((value) => !value)}
            className="h-12 rounded-full border border-black/10 bg-white/90 px-5 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            {selectionMode ? cancelSelectLabel : selectLabel}
          </button>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-[24px] border-[2.25px] border-black/18 bg-white/82">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#eee5da] text-xs uppercase tracking-[0.18em] text-[#5a4b40]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-4 py-4 font-semibold",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.sortable ? (
                      <Link
                        href={buildSortHref({
                          currentPath,
                          preservedParams,
                          query,
                          sort,
                          direction,
                          target: column.key,
                        })}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-black/5",
                          column.align === "right" && "justify-end",
                        )}
                      >
                        {column.label}
                        {sort === column.key ? (
                          direction === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-55" />
                        )}
                      </Link>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                {showActions ? (
                  <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">
                    {actionsLabel}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y-[2.25px] divide-black/18">
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    className="px-4 py-10 text-center text-sm text-[var(--color-muted)]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id} id={row.id} className="bg-white/55 align-top transition hover:bg-white">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-4 text-[var(--color-foreground)]",
                          column.align === "right" && "text-right",
                          column.className,
                        )}
                      >
                        {row.cells[column.key]}
                      </td>
                    ))}
                    {showActions ? (
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">{row.actions}</div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
          <span>
            {pagination.label
              .replace("{page}", String(pagination.page))
              .replace("{totalPages}", String(pagination.totalPages))
              .replace("{totalItems}", String(pagination.totalItems))}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildPageHref({
                currentPath,
                preservedParams,
                query,
                sort,
                direction,
                page: Math.max(1, pagination.page - 1),
              })}
              aria-disabled={pagination.page <= 1}
              className={cn(
                "rounded-full border border-black/10 bg-white/90 px-4 py-2 font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
                pagination.page <= 1 && "pointer-events-none opacity-45",
              )}
            >
              {pagination.previousLabel}
            </Link>
            <Link
              href={buildPageHref({
                currentPath,
                preservedParams,
                query,
                sort,
                direction,
                page: Math.min(pagination.totalPages, pagination.page + 1),
              })}
              aria-disabled={pagination.page >= pagination.totalPages}
              className={cn(
                "rounded-full border border-black/10 bg-white/90 px-4 py-2 font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
                pagination.page >= pagination.totalPages && "pointer-events-none opacity-45",
              )}
            >
              {pagination.nextLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
