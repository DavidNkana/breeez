import Link from 'next/link';
import { getPagination, pageHref, pageNumbers, PRODUCTS_PER_PAGE, type QueryParams } from '@/lib/catalog/pagination';

type ProductPaginationProps = {
  pathname: string;
  query: QueryParams;
  page: number;
  totalCount: number;
};

export function ProductPagination({ pathname, query, page, totalCount }: ProductPaginationProps) {
  const pagination = getPagination(totalCount, page, PRODUCTS_PER_PAGE);
  if (pagination.totalPages <= 1) return null;

  return (
    <nav aria-label="Product pages" className="mt-8 flex flex-col gap-4 border-t border-brand-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-brand-600 dark:text-brand-300">
        Page {page} of {pagination.totalPages} · {totalCount} {totalCount === 1 ? 'product' : 'products'}
      </p>
      <div className="flex flex-wrap items-center gap-1" aria-label="Pagination links">
        {pagination.hasPreviousPage ? (
          <Link
            href={pageHref(pathname, query, page - 1)}
            rel="prev"
            className="rounded-md border border-brand-300 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-800"
          >
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className="cursor-not-allowed rounded-md border border-brand-100 px-3 py-2 text-sm text-brand-400">Previous</span>
        )}
        {pageNumbers(page, pagination.totalPages).map((item, index) => item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} aria-hidden="true" className="px-2 text-brand-500">…</span>
        ) : (
          <Link
            key={item}
            href={pageHref(pathname, query, item)}
            aria-current={item === page ? 'page' : undefined}
            className={item === page
              ? 'rounded-md bg-brand-900 px-3 py-2 text-sm font-semibold text-white'
              : 'rounded-md border border-brand-300 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-800'}
          >
            {item}
          </Link>
        ))}
        {pagination.hasNextPage ? (
          <Link
            href={pageHref(pathname, query, page + 1)}
            rel="next"
            className="rounded-md border border-brand-300 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-800"
          >
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className="cursor-not-allowed rounded-md border border-brand-100 px-3 py-2 text-sm text-brand-400">Next</span>
        )}
      </div>
    </nav>
  );
}
