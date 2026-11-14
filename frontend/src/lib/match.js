export const norm = (s) => (s ?? '').trim().toLowerCase()

/**
 * Autocomplete ranking: names starting with the query first, then a word starting with it, then
 * containing it; shorter names first within each. Skips names in `taken` (a Set of norm()ed names).
 */
export function rankMatches(query, names, taken = new Set(), limit = 8) {
  const q = norm(query)
  if (!q) return []
  const rank = (name) => {
    const n = name.toLowerCase()
    if (n.startsWith(q)) return 0
    if (n.split(/[\s/.()-]+/).some((w) => w.startsWith(q))) return 1
    return n.includes(q) ? 2 : 9
  }
  return names
    .filter((n) => !taken.has(norm(n)))
    .map((n) => [n, rank(n)])
    .filter(([, r]) => r < 9)
    .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length)
    .slice(0, limit)
    .map(([n]) => n)
}
