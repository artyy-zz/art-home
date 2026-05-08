export const DEFAULT_PAGE_SIZE = 25;

export type PaginatedResult<T> = {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function paginationArgs(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, page);

  return {
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  };
}

export function paginatedResult<T>({
  items,
  totalItems,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  items: T[];
  totalItems: number;
  page: number;
  pageSize?: number;
}): PaginatedResult<T> {
  return {
    items,
    totalItems,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}
