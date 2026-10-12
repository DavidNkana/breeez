export const PRODUCTS_PER_PAGE = 24;
const MAX_PAGE = 1_000_000;

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || !/^\d+$/.test(raw)) return 1;

  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1;
}

export function shouldRedirectToCanonicalPage(value: string | string[] | undefined, page: number): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length !== 1 || value[0] !== String(page);
  return value !== String(page);
}

export function getPagination(totalCount: number, page: number, pageSize = PRODUCTS_PER_PAGE) {
  const safePage = Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1;
  const totalPages = Math.ceil(Math.max(0, totalCount) / pageSize);
  return {
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    offset: (safePage - 1) * pageSize,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

export function shouldRedirectToFirstPage(page: number, totalPages: number): boolean {
  return page > 1 && (totalPages === 0 || page > totalPages);
}

export type QueryParams = Record<string, string | string[] | undefined>;

export function pageHref(pathname: string, params: QueryParams, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page' || value == null) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  if (page > 1) query.set('page', String(page));
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function pageNumbers(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('ellipsis');
    result.push(page);
  });
  return result;
}
