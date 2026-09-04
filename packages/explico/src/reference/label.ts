/**
 * Display label for a notation entry (Phase C1b, replacing the authored
 * `title`). Default = the key humanized: split on `-`/`.`, upper-case known
 * acronyms, capitalize the first word. An entry may still set an explicit
 * `label` where the humanized key would read wrong.
 */

const ACRONYMS = new Map<string, string>([
  ['cds', 'CDS'],
  ['cdx', 'CDX'],
  ['isda', 'ISDA'],
  ['pv', 'PV'],
  ['npv', 'NPV'],
  ['lgd', 'LGD'],
  ['ytm', 'YTM'],
  ['rop', 'RoP'],
]);

// Adjacent key words that stay hyphenated (compound modifiers) rather than
// becoming a space.
const COMPOUNDS = new Set([
  'risk-neutral',
  'real-world',
  'price-yield',
  'market-standard',
  'risk-free',
]);

export function humanizeKey(key: string): string {
  const words = key.split(/[-.]/).filter(Boolean);
  const cased = words.map((word, index) => {
    const acronym = ACRONYMS.get(word);
    if (acronym) return acronym;
    return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
  let out = cased[0] ?? '';
  for (let i = 1; i < cased.length; i += 1) {
    const joiner = COMPOUNDS.has(`${words[i - 1]}-${words[i]}`) ? '-' : ' ';
    out += joiner + cased[i];
  }
  return out;
}

/** The label an entry resolves to: an explicit `label`, else the humanized key. */
export function resolveLabel(key: string, label?: string): string {
  return label && label.trim().length > 0 ? label : humanizeKey(key);
}
