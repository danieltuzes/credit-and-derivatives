/**
 * Glosses and formula scope (D15) — the second tier of the notation
 * vocabulary.
 *
 * A **card** is a `content/notation/*.md` entry (or a `notation.local` entry):
 * symbol, name, description, units, sources, curriculum alignment, review
 * state. It gets a glossary card and is a node in the curriculum graph.
 *
 * A **gloss** is declared on a card, in that card's `glosses:` frontmatter,
 * and carries a symbol, a name, and optionally a bare units string. It exists
 * for one reason: so a card's rigorous `formula` can name its own letters
 * without each letter having to become a card. A gloss has no description, no
 * sources, no alignment, no review state, and no glossary card — and, the
 * point of the whole tier, **it creates no curriculum edge**. A card that
 * dragged its formula's letters into the registry would drag them into the
 * lesson bundle of every lesson that uses it, and a foundations lesson would
 * fail `alignment-introduction` on a symbol introduced six lessons later.
 *
 * The editorial convention (not enforced here): a card's formula may introduce
 * glosses; glosses terminate — they have no formula of their own. A symbol
 * that later needs a real definition is **promoted**: delete the gloss line,
 * add `content/notation/<key>.md`. Because a formula spells LaTeX and never a
 * key, nothing else in the corpus changes.
 */
export interface NotationGlossInput {
  readonly latex: string;
  readonly name: string;
  readonly units?: string;
}

/** A gloss with its derived key and display label. */
export interface ResolvedGloss {
  /** `<card key>.<slug(name)>` — derived, never authored. */
  readonly key: string;
  readonly notation: string;
  readonly label: string;
  readonly units?: string;
  /** The card that declares it. */
  readonly ownerKey: string;
}

/** One `{key, notation}` row of the flat table `resolveMathGlyphs` consumes. */
export interface GlyphScopeEntry {
  readonly key: string;
  readonly notation: string;
}

/**
 * The key segment derived from a gloss name: lower-cased, runs of anything
 * that is not a letter or digit collapsed to a single `-`. Returns `undefined`
 * when the name has no usable characters, so the schema can reject it rather
 * than the loader minting an invalid key.
 */
export function glossKeySegment(name: string): string | undefined {
  const segment = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return segment.length > 0 ? segment : undefined;
}

/**
 * Derive a gloss's key. Dotted onto the owning card's key, so a gloss is
 * entry-scoped by construction: two cards may each gloss `T`, and a gloss can
 * never be confused with a card in the flat registry.
 */
export function glossKey(ownerKey: string, name: string): string {
  const segment = glossKeySegment(name);
  if (segment === undefined) {
    throw new Error(
      `Gloss name ${JSON.stringify(name)} on ${ownerKey} yields no key segment.`,
    );
  }
  return `${ownerKey}.${segment}`;
}

/** Resolve a card's authored `glosses:` list into keyed, labelled entries. */
export function resolveGlosses(
  ownerKey: string,
  glosses: readonly NotationGlossInput[],
): ResolvedGloss[] {
  return glosses.map((gloss) => ({
    key: glossKey(ownerKey, gloss.name),
    notation: gloss.latex,
    label: gloss.name,
    ownerKey,
    ...(gloss.units === undefined ? {} : { units: gloss.units }),
  }));
}

/** `\explain{key}` occurrences in a formula — scope only, never a reference. */
const EXPLAIN_KEY = /\\explain\s*\{([a-z0-9]+(?:[.-][a-z0-9]+)*)\}/g;

export function formulaExplainKeys(formula: string): string[] {
  EXPLAIN_KEY.lastIndex = 0;
  return [...formula.matchAll(EXPLAIN_KEY)].map((match) => match[1] ?? '');
}

/**
 * The glyph table a card's `formula` resolves against:
 *
 *     {the card itself} ∪ {its glosses} ∪ {cards its formula names} ∪ base library
 *
 * Narrower than the registry-wide table a card's *body* math still uses, and
 * narrower than a lesson page's scope. A card named with `\explain{key}` in
 * the formula joins the table for glyph resolution **only**: its existence is
 * checked, but it deliberately becomes no reference edge, because a
 * definitional letter is not a curriculum prerequisite. See the module note.
 */
export function formulaGlyphScope(input: {
  readonly key: string;
  readonly notation: string;
  readonly formula?: string;
  readonly glosses: readonly ResolvedGloss[];
  /** Every card by key — shared entries, plus page-local ones for a lesson. */
  readonly cardsByKey: ReadonlyMap<string, GlyphScopeEntry>;
}): GlyphScopeEntry[] {
  const scope: GlyphScopeEntry[] = [
    { key: input.key, notation: input.notation },
  ];
  const seen = new Set([input.key]);

  for (const gloss of input.glosses) {
    if (seen.has(gloss.key)) continue;
    seen.add(gloss.key);
    scope.push({ key: gloss.key, notation: gloss.notation });
  }

  for (const key of formulaExplainKeys(input.formula ?? '')) {
    if (seen.has(key)) continue;
    const card = input.cardsByKey.get(key);
    if (!card) continue;
    seen.add(key);
    scope.push({ key: card.key, notation: card.notation });
  }

  return scope;
}

/**
 * Keys named by a formula that no card defines. The build reports these — an
 * `\explain{…}` pointing at nothing is an authoring mistake, not a silent
 * fallback to an unresolved glyph.
 */
export function unknownFormulaScopeKeys(
  formula: string | undefined,
  glossKeys: ReadonlySet<string>,
  cardKeys: ReadonlySet<string>,
): string[] {
  return formulaExplainKeys(formula ?? '').filter(
    (key) => !cardKeys.has(key) && !glossKeys.has(key),
  );
}
