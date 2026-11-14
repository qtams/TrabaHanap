// Merge profile fields imported from a resume into the current profile without losing anything typed by hand:
// - single fields (name, email, summary…) are filled only when empty;
// - lists of records get the ones that aren't there yet (matched by name, case-insensitive);
// - skills get the ones that aren't there yet, per category;
// - preferences are never touched (a resume doesn't state them).

const empty = (v) => v === '' || v === null || v === undefined
const norm = (s) => String(s ?? '').trim().toLowerCase()

const fillEmpty = (current, incoming = {}) =>
  Object.fromEntries(Object.entries(current).map(([k, v]) => [k, empty(v) && !empty(incoming[k]) ? incoming[k] : v]))

const addMissing = (current, incoming = [], key) => {
  const seen = new Set(current.map(key))
  return [...current, ...incoming.filter((item) => !seen.has(key(item)))]
}

const union = (a = [], b = []) => [...a, ...b.filter((x) => !a.some((y) => norm(y) === norm(x)))]

export function mergeProfile(current, incoming) {
  return {
    ...current,
    personal: fillEmpty(current.personal, incoming.personal),
    summary: fillEmpty(current.summary, incoming.summary),
    experience: addMissing(current.experience, incoming.experience, (j) => `${norm(j.company)}|${norm(j.title)}`),
    education: addMissing(current.education, incoming.education, (e) => `${norm(e.school)}|${norm(e.degree)}`),
    certifications: addMissing(current.certifications, incoming.certifications, (c) => norm(c.name)),
    projects: addMissing(current.projects, incoming.projects, (p) => norm(p.name)),
    skills: Object.fromEntries(Object.entries(current.skills).map(([k, v]) => [k, union(v, incoming.skills?.[k])])),
  }
}
