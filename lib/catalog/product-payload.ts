type NewProductInsertInput = {
  slug: string;
  name: string;
  description: string;
  categoryId: string | null;
  basePriceCents: number;
  compareAtCents: number | null;
  tags: string[];
  isActive: boolean;
};

export function mapNewProductInsert(input: NewProductInsertInput) {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    base_price_cents: input.basePriceCents,
    compare_at_cents: input.compareAtCents,
    tags: input.tags,
    is_active: input.isActive,
  };
}
