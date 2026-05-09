export const DEFAULT_PAGE_SIZE = 25;

export type PaginatedResult<T> = {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  exactTotal: boolean;
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

export function paginationSliceArgs(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return {
    ...paginationArgs(page, pageSize),
    take: pageSize + 1,
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
    hasNextPage: page * pageSize < totalItems,
    hasPreviousPage: page > 1,
    exactTotal: true,
  };
}

export function paginatedSliceResult<T>({
  items,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  items: T[];
  page: number;
  pageSize?: number;
}): PaginatedResult<T> {
  const hasNextPage = items.length > pageSize;
  const visibleItems = hasNextPage ? items.slice(0, pageSize) : items;
  const minimumTotalItems = (Math.max(1, page) - 1) * pageSize + visibleItems.length;

  return {
    items: visibleItems,
    totalItems: hasNextPage ? minimumTotalItems + 1 : minimumTotalItems,
    page,
    pageSize,
    totalPages: hasNextPage ? page + 1 : Math.max(1, page),
    hasNextPage,
    hasPreviousPage: page > 1,
    exactTotal: false,
  };
}
