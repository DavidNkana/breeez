export function getCheckoutProductSlugs(items: any[]) {
  return Array.from(new Set(
    items
      .map((item) => item.variant?.product?.slug)
      .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0),
  ));
}
