export const IMPORT_STOCK_FLOOR = 10;

export function importedStock(value: unknown) {
  const quantity = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(quantity) && quantity > IMPORT_STOCK_FLOOR ? quantity : IMPORT_STOCK_FLOOR;
}

function categoryKey(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’‘‛′]/g, "'")
    .replace(/'/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Resolve a parser hint against the categories already loaded by the admin form. */
export function resolveImportedCategory(hint: string | null | undefined, categories: Array<{ id: string; name: string; slug: string }>) {
  if (!hint?.trim()) return undefined;
  const hintKey = categoryKey(hint);
  const aliases: Record<string, string[]> = {
    shoes: ['shoe', 'shoes', 'footwear', 'trainer', 'trainers', 'sneaker', 'sneakers'],
    women: ['women', 'woman', 'womens', "women's", 'ladies', 'female'],
    men: ['men', 'man', 'mens', "men's", 'male'],
    kids: ['kids', 'children', 'childrens', "children's", 'boys', 'girls'],
    apparel: ['apparel', 'clothing', 'clothes', 'fashion'],
    'plus-size': ['plus size', 'curve', 'curvy'],
    babywear: ['baby', 'babywear', 'babygrow'],
    bags: ['bag', 'bags', 'handbag', 'handbags'],
  };
  const containsPhrase = (haystack: string, needle: string) =>
    ` ${haystack} `.includes(` ${needle} `);
  type MatchScore = [number, number, number];
  type PhraseSpecificity = [number, number];
  const phraseSpecificity = (phrase: string): PhraseSpecificity => [phrase.split(' ').length, phrase.length];
  const compareScores = (left: MatchScore, right: MatchScore) => {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  };
  const scoreValue = (value: string): MatchScore | undefined => {
    const key = categoryKey(value);
    if (!key) return undefined;
    if (key === hintKey) return [5, ...phraseSpecificity(key)];

    let bestAlias: PhraseSpecificity | undefined;
    let bestAliasPriority = 0;
    for (const [canonical, values] of Object.entries(aliases)) {
      const categoryAliases = [canonical, ...values].map(categoryKey);
      if (!categoryAliases.includes(key)) continue;
      for (const alias of categoryAliases) {
        if (containsPhrase(hintKey, alias)) {
          const specificity = phraseSpecificity(alias);
          // Product-specific aliases (especially footwear) outrank generic
          // retailer/source-name fragments such as "Fashion World".
          const priority = canonical === 'shoes' ? 4 : canonical === 'women' || canonical === 'men' || canonical === 'kids' ? 3 : 2;
          if (!bestAlias || priority > bestAliasPriority || (priority === bestAliasPriority && compareScores([1, ...specificity], [1, ...bestAlias]) > 0)) {
            bestAlias = specificity;
            bestAliasPriority = priority;
          }
        }
      }
    }
    if (bestAlias) return [bestAliasPriority, ...bestAlias];
    if (containsPhrase(hintKey, key)) return [1, ...phraseSpecificity(key)];
    return undefined;
  };

  let best: { category: (typeof categories)[number]; score: MatchScore } | undefined;
  for (const category of categories) {
    const values = [scoreValue(category.name), scoreValue(category.slug)].filter((score): score is MatchScore => Boolean(score));
    const score = values.reduce<MatchScore | undefined>((current, candidate) =>
      !current || compareScores(candidate, current) > 0 ? candidate : current, undefined);
    if (score && (!best || compareScores(score, best.score) > 0)) {
      best = { category, score };
    }
  }
  return best?.category;
}
