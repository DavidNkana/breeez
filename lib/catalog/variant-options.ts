export type VariantOptionSource = {
  options?: Record<string, string> | null;
  name?: string | null;
  sku?: string | null;
  stock?: number | string | null;
  is_active?: boolean | null;
  active?: boolean | null;
};

export type VariantOptionGroup = {
  key: string;
  values: string[];
};

export type VariantOptionRenderModel = VariantOptionGroup & {
  options: Array<{ value: string; isSelected: boolean; disabled: boolean; crossedOut: boolean }>;
};

/** Convert importer/editor keys into consistent, customer-facing labels. */
export function optionLabel(key: string) {
  const cleaned = key.trim().replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  if (/^size$/i.test(cleaned)) return 'Size';
  if (/^colou?r$/i.test(cleaned)) return 'Color';
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function optionEntries(variant: VariantOptionSource) {
  return Object.entries(variant.options ?? {})
    .map(([key, value]) => [optionLabel(key), String(value).trim()] as const)
    .filter(([key, value]) => key.toLowerCase() !== 'sku' && value.length > 0);
}

export function getVariantOptionGroups(variants: VariantOptionSource[]): VariantOptionGroup[] {
  const groups = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const [key, value] of optionEntries(variant)) {
      const values = groups.get(key) ?? new Set<string>();
      values.add(value);
      groups.set(key, values);
    }
  }
  return Array.from(groups, ([key, values]) => ({ key, values: Array.from(values) }));
}

export function getVariantOptionValue(variant: VariantOptionSource, key: string) {
  return optionEntries(variant).find(([entryKey]) => entryKey === key)?.[1];
}

export function getVariantDisplayName(variant: VariantOptionSource) {
  const options = optionEntries(variant);
  if (options.length > 0) return options.map(([, value]) => value).join(' / ');
  if (variant.name && variant.name !== 'Default' && variant.name !== variant.sku) return variant.name;
  return 'Standard';
}

/** Runtime-safe because API/database boundaries can represent integer values as strings. */
export function getAvailableStock(stock: number | string | null | undefined) {
  const quantity = typeof stock === 'number' ? stock : Number(typeof stock === 'string' ? stock.trim() : NaN);
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
}

/** A variant can be selected for purchase only when it is active and has stock. */
export function isPurchasableVariant(variant: VariantOptionSource) {
  return variant.is_active !== false && variant.active !== false && (variant.stock === undefined || getAvailableStock(variant.stock) > 0);
}

export function canAddVariantToCart(variant: VariantOptionSource | null | undefined, quantity: number) {
  return Boolean(variant && quantity > 0 && getAvailableStock(variant.stock) >= quantity && isPurchasableVariant(variant));
}

export function getVariantForOptions<T extends VariantOptionSource>(
  variants: T[],
  optionKeys: string[],
  selectedOptions: Record<string, string>
) {
  return variants.find((variant) =>
    optionKeys.every((key) => {
      const value = getVariantOptionValue(variant, key);
      return value !== undefined && value === selectedOptions[key];
    })
  ) ?? null;
}

export function getPurchasableVariantForOptions<T extends VariantOptionSource>(
  variants: T[],
  optionKeys: string[],
  selectedOptions: Record<string, string>
) {
  return variants.find((variant) =>
    isPurchasableVariant(variant) && optionKeys.every((key) => {
      const value = getVariantOptionValue(variant, key);
      return value !== undefined && value === selectedOptions[key];
    })
  ) ?? null;
}

/** Return values that still lead to an active, in-stock combination. */
export function getValidOptionValues(
  variants: VariantOptionSource[],
  optionKeys: string[],
  selectedOptions: Record<string, string>,
  key: string
) {
  const values = new Set<string>();
  const others = optionKeys.filter((optionKey) => optionKey !== key);
  for (const variant of variants) {
    if (!isPurchasableVariant(variant)) continue;
    if (!others.every((optionKey) => getVariantOptionValue(variant, optionKey) === selectedOptions[optionKey])) continue;
    const value = getVariantOptionValue(variant, key);
    if (value) values.add(value);
  }
  return Array.from(values);
}

/** Render contract for option controls: unavailable values remain discoverable. */
export function getVariantOptionRenderModel(
  variants: VariantOptionSource[],
  selectedOptions: Record<string, string>,
): VariantOptionRenderModel[] {
  const groups = getVariantOptionGroups(variants);
  return groups.map(({ key, values }) => {
    const validValues = new Set(getValidOptionValues(variants, groups.map((group) => group.key), selectedOptions, key));
    return {
      key,
      values,
      options: values.map((value) => ({
        value,
        isSelected: selectedOptions[key] === value,
        disabled: !validValues.has(value),
        crossedOut: !validValues.has(value),
      })),
    };
  });
}

/** Keep as many existing choices as possible while always producing a valid combination. */
export function reconcileSelectedOptions(
  variants: VariantOptionSource[],
  optionKeys: string[],
  selectedOptions: Record<string, string>
) {
  if (optionKeys.length === 0 || variants.length === 0) return {};

  const completeVariants = variants.filter((variant) =>
    isPurchasableVariant(variant) && optionKeys.every((key) => getVariantOptionValue(variant, key) !== undefined)
  );
  const bestVariant = completeVariants.reduce((best, variant) => {
    const score = optionKeys.reduce(
      (total, key) => total + (getVariantOptionValue(variant, key) === selectedOptions[key] ? 1 : 0),
      0
    );
    const bestScore = best
      ? optionKeys.reduce(
          (total, key) => total + (getVariantOptionValue(best, key) === selectedOptions[key] ? 1 : 0),
          0
        )
      : -1;
    return score > bestScore ? variant : best;
  }, null as VariantOptionSource | null);

  const reconciled: Record<string, string> = {};
  for (const key of optionKeys) {
    const value = bestVariant && getVariantOptionValue(bestVariant, key);
    if (value) reconciled[key] = value;
  }
  return reconciled;
}
