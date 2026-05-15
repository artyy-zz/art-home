"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import useSWRImmutable from "swr/immutable";
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
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  exactTotal?: boolean;
  label: string;
  previousLabel: string;
  nextLabel: string;
};

type TableCache = {
  rows: Row[];
  pagination?: Pagination;
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

function activePaginationKey(pagination?: Pagination) {
  if (!pagination) {
    return "page:client";
  }

  return `page:${pagination.page}:size:${pagination.pageSize}`;
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectionMode, setSelectionMode] = useState(false);
  const cacheKey = useMemo(
    () => [
      "admin-list",
      currentPath,
      JSON.stringify(preservedParams ?? {}),
      query,
      sort ?? "",
      direction,
      activePaginationKey(pagination),
      serverControlled ? "server" : "client",
    ],
    [currentPath, direction, pagination, preservedParams, query, serverControlled, sort],
  );
  const { data: cachedTable, mutate } = useSWRImmutable<TableCache>(
    cacheKey,
    null,
    {
      fallbackData: { rows, pagination },
    },
  );

  useEffect(() => {
    void mutate({ rows, pagination }, { revalidate: false });
  }, [mutate, pagination, rows]);

  const activeRows = cachedTable?.rows ?? rows;
  const activePagination = cachedTable?.pagination ?? pagination;
  const normalizedQuery = normalizeSearch(query.trim());
  const filteredRows = !serverControlled && normalizedQuery
    ? activeRows.filter((row) => normalizeSearch(row.searchText).includes(normalizedQuery))
    : activeRows;

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
  const sortableColumns = columns.filter((column) => column.sortable);
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!serverControlled) {
      return;
    }

    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const text = String(value);
      if (text) {
        params.set(key, text);
      }
    }

    startTransition(() => {
      router.push(params.size > 0 ? `${currentPath}?${params.toString()}` : currentPath);
    });
  };

  return (
    <div className={cn("space-y-4 transition-opacity", isPending && "opacity-70")}>
      <form action={currentPath} onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
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
        <button
          disabled={isPending}
          className="min-h-12 rounded-full bg-[var(--color-foreground)] px-5 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-65 sm:w-auto"
        >
          {isPending ? "..." : searchLabel}
        </button>
        {actionsLabel ? (
          <button
            type="button"
            onClick={() => setSelectionMode((value) => !value)}
            className="min-h-12 rounded-full border border-black/10 bg-white/90 px-5 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] sm:w-auto"
          >
            {selectionMode ? cancelSelectLabel : selectLabel}
          </button>
        ) : null}
      </form>

      {sortableColumns.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {sortableColumns.map((column) => (
            <Link
              key={column.key}
              href={buildSortHref({
                currentPath,
                preservedParams,
                query,
                sort,
                direction,
                target: column.key,
              })}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
                sort === column.key && "border-[var(--color-accent)] bg-[var(--color-accent-soft)]",
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
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:hidden">
        {sortedRows.length === 0 ? (
          <div className="rounded-[22px] border-[2.25px] border-black/18 bg-white/82 px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            {emptyMessage}
          </div>
        ) : (
          sortedRows.map((row, index) => (
            <article
              key={row.id}
              id={`mobile-${row.id}`}
              className={cn(
                "rounded-[22px] border-[2.25px] border-black/18 p-4 shadow-[0_14px_36px_rgba(18,16,14,0.06)]",
                index % 2 === 0 ? "bg-white/88" : "bg-[#f2eee8]",
              )}
            >
              <dl className="grid gap-3">
                {columns.map((column) => (
                  <div key={column.key} className="grid gap-1 border-b border-black/8 pb-3 last:border-b-0 last:pb-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6a5a4d]">
                      {column.label}
                    </dt>
                    <dd
                      className={cn(
                        "min-w-0 break-words text-sm text-[var(--color-foreground)]",
                        column.align === "right" && "sm:text-right",
                      )}
                    >
                      {row.cells[column.key]}
                    </dd>
                  </div>
                ))}
              </dl>
              {showActions ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-black/8 pt-4">
                  {row.actions}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-[24px] border-[2.25px] border-black/18 bg-white/82 md:block">
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
                sortedRows.map((row, index) => (
                  <tr
                    key={row.id}
                    id={row.id}
                    className={cn(
                      "align-top transition hover:bg-white",
                      index % 2 === 0 ? "bg-white/75" : "bg-[#f3eee8]",
                    )}
                  >
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

      {activePagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
          <span>
            {activePagination.label
              .replace("{page}", String(activePagination.page))
              .replace("{totalPages}", String(activePagination.totalPages))
              .replace(
                "{totalItems}",
                `${activePagination.totalItems}${activePagination.exactTotal === false ? "+" : ""}`,
              )}
          </span>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href={buildPageHref({
                currentPath,
                preservedParams,
                query,
                sort,
                direction,
                page: Math.max(1, activePagination.page - 1),
              })}
              aria-disabled={activePagination.hasPreviousPage === false || activePagination.page <= 1}
              className={cn(
                "flex-1 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-center font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] sm:flex-none",
                (activePagination.hasPreviousPage === false || activePagination.page <= 1) &&
                  "pointer-events-none opacity-45",
              )}
            >
              {activePagination.previousLabel}
            </Link>
            <Link
              href={buildPageHref({
                currentPath,
                preservedParams,
                query,
                sort,
                direction,
                page: Math.min(activePagination.totalPages, activePagination.page + 1),
              })}
              aria-disabled={activePagination.hasNextPage === false || activePagination.page >= activePagination.totalPages}
              className={cn(
                "flex-1 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-center font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] sm:flex-none",
                (activePagination.hasNextPage === false || activePagination.page >= activePagination.totalPages) &&
                  "pointer-events-none opacity-45",
              )}
            >
              {activePagination.nextLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
