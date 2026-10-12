import assert from 'node:assert/strict';
import test from 'node:test';
import { getPagination, pageHref, pageNumbers, parsePage, shouldRedirectToCanonicalPage, shouldRedirectToFirstPage } from '../lib/catalog/pagination';

test('pagination math uses 24 products and exact page boundaries', () => {
  assert.deepEqual(getPagination(49, 2), {
    page: 2,
    pageSize: 24,
    totalCount: 49,
    totalPages: 3,
    offset: 24,
    hasPreviousPage: true,
    hasNextPage: true,
  });
  assert.equal(getPagination(48, 2).hasNextPage, false);
  assert.equal(getPagination(0, 1).totalPages, 0);
  assert.deepEqual(getPagination(48, 2), {
    page: 2,
    pageSize: 24,
    totalCount: 48,
    totalPages: 2,
    offset: 24,
    hasPreviousPage: true,
    hasNextPage: false,
  });
});

test('page URLs preserve filters and remove page when returning to page one', () => {
  const params = { q: 'red shoes', sort: 'price_asc', minPrice: '10', page: '3' };
  assert.equal(pageHref('/search', params, 2), '/search?q=red+shoes&sort=price_asc&minPrice=10&page=2');
  assert.equal(pageHref('/search', params, 1), '/search?q=red+shoes&sort=price_asc&minPrice=10');
});

test('invalid pages normalize safely and numbered links include useful boundaries', () => {
  assert.equal(parsePage('0'), 1);
  assert.equal(parsePage('-2'), 1);
  assert.equal(parsePage('2.5'), 1);
  assert.equal(parsePage('2products'), 1);
  assert.equal(parsePage('1e100'), 1);
  assert.equal(parsePage('999999999999999999999999999999'), 1);
  assert.equal(parsePage('not-a-page'), 1);
  assert.equal(getPagination(24, Number.POSITIVE_INFINITY).page, 1);
  assert.deepEqual(pageNumbers(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
});

test('invalid and redundant page queries redirect to one canonical URL without looping', () => {
  const cases: Array<[string | string[], number]> = [
    ['0', 1],
    ['1', 1],
    ['-2', 1],
    ['2.5', 1],
    ['999999999999999999999999999999', 1],
    ['1e309', 1],
    ['2', 2],
  ];

  for (const [value, page] of cases) {
    const shouldRedirect = shouldRedirectToCanonicalPage(value, page);
    assert.equal(shouldRedirect, value !== String(page));
    if (shouldRedirect) {
      const href = pageHref('/search', { q: 'red shoes', sort: 'price_asc', page: value }, page);
      assert.equal(href, page === 1 ? '/search?q=red+shoes&sort=price_asc' : '/search?q=red+shoes&sort=price_asc&page=2');
      assert.equal(shouldRedirectToCanonicalPage(String(page), page), false);
    }
  }

  assert.equal(pageHref('/search', { q: 'red shoes', sort: 'price_asc', page: '2' }, 2), '/search?q=red+shoes&sort=price_asc&page=2');
  assert.equal(shouldRedirectToCanonicalPage('2', 2), false);
  assert.equal(shouldRedirectToCanonicalPage(undefined, 1), false);
  assert.equal(shouldRedirectToCanonicalPage(['2', '3'], 2), true);
});

test('page two redirects to page one for empty catalogs and over the final page', () => {
  assert.equal(shouldRedirectToFirstPage(2, 0), true);
  assert.equal(shouldRedirectToFirstPage(2, 1), true);
  assert.equal(shouldRedirectToFirstPage(1, 0), false);
  assert.equal(shouldRedirectToFirstPage(2, 2), false);
});
