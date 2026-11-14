export const SETUPS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite' }
export const TYPES = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship' }
export const LEVELS = { entry: 'Entry level / fresh grad', junior: 'Junior', mid: 'Mid-level', senior: 'Senior', lead: 'Lead / supervisor / manager' }
export const POSTED = { 1: 'Past 24 hours', 3: 'Past 3 days', 7: 'Past week', 14: 'Past 2 weeks', 30: 'Past month' }
export const SOURCE_NAMES = { himalayas: 'Himalayas', remotive: 'Remotive', greenhouse: 'Greenhouse', lever: 'Lever' }

// Boards without a public search API: we can't search them, only open their own search page
// with the same query (a plain link, which their terms allow).
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// JobStreet / Indeed links take one search: the first job title and the first location.
const query = (f) => [f.query || f.titles?.[0], f.company].map((s) => s?.trim()).filter(Boolean).join(' ')
const place = (f) => (f.locations?.[0] ?? '').replace(/^anywhere in (the )?/i, '').trim()
const isCountry = (loc) => !loc || /^philippines$/i.test(loc)

export const EXTERNAL = [
  {
    key: 'jobstreet',
    name: 'JobStreet',
    note: 'No public search API. Opens JobStreet with your search.',
    url: (f) => {
      const days = { 1: 1, 3: 3, 7: 7, 14: 14, 30: 31 }[f.posted_within]
      const path = `${query(f) ? `${slug(query(f))}-jobs` : 'jobs'}${isCountry(place(f)) ? '' : `/in-${slug(place(f))}`}`
      return `https://ph.jobstreet.com/${path}${days ? `?daterange=${days}` : ''}`
    },
  },
  {
    key: 'indeed',
    name: 'Indeed',
    note: 'No public search API. Opens Indeed Philippines with your search.',
    url: (f) => {
      const days = { 1: 1, 3: 3, 7: 7, 14: 14 }[f.posted_within]
      const p = new URLSearchParams({ q: query(f), l: place(f) || 'Philippines', ...(days && { fromage: days }) })
      return `https://ph.indeed.com/jobs?${p}`
    },
  },
]
const EXTERNAL_KEYS = EXTERNAL.map((e) => e.key)

// A blank search form: Philippines, every platform selected. titles / locations: several, any matches.
export const emptySearch = (sources = []) => ({
  query: '', // the search box; when filled it replaces the job titles
  titles: [], keywords: [], locations: ['Philippines'], company: '', // keywords: skills, any of them matches
  salary_min: null, salary_max: null, salary_currency: 'PHP',
  sources: [...sources.map((s) => s.key), ...EXTERNAL_KEYS], work_setups: [], employment_types: [], levels: [], posted_within: '',
})

// Form state → request body: only the platforms we search ourselves, and no empty fields.
export const searchParams = (form) =>
  Object.fromEntries(
    Object.entries({ ...form, sources: form.sources.filter((k) => !EXTERNAL_KEYS.includes(k)) })
      .filter(([, v]) => v !== '' && v !== null && !(Array.isArray(v) && v.length === 0)),
  )

// A saved search's params → form state. History only stores the platforms we searched, so the
// external boards come back selected; an old search without a location stays without one.
export const formFromParams = ({ title, location, ...params }, sources) => ({
  ...emptySearch(sources),
  ...params,
  titles: params.titles ?? (title ? [title] : []), // older searches stored one title / location
  locations: params.locations ?? (location ? [location] : []),
  keywords: Array.isArray(params.keywords) ? params.keywords : params.keywords ? [params.keywords] : [],
  ...(params.sources && { sources: [...params.sources, ...EXTERNAL_KEYS] }),
})

// The selected external boards, each with a link to the same search there.
export const externalLinks = (form) =>
  EXTERNAL.filter((e) => form.sources.includes(e.key)).map((e) => ({ key: e.key, name: e.name, url: e.url(form) }))

export function timeAgo(iso) {
  if (!iso) return null
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : null

// One-line summary of a search's parameters, for history.
export function describeSearch(p) {
  const titles = (p.titles ?? [p.title]).filter(Boolean).join(' / ')
  const places = (p.locations ?? [p.location]).filter(Boolean).join(', ')
  const keywords = [p.keywords].flat().filter(Boolean).join(', ')
  const parts = [p.query ? `“${p.query}”` : titles, keywords, p.company && `at ${p.company}`, places && `in ${places}`].filter(Boolean)
  const filters = [
    ...(p.work_setups ?? []).map((v) => SETUPS[v]),
    ...(p.employment_types ?? []).map((v) => TYPES[v]),
    ...(p.levels ?? []).map((v) => LEVELS[v]),
    p.posted_within && POSTED[p.posted_within],
    p.salary_min && `≥ ${p.salary_currency ?? ''} ${Number(p.salary_min).toLocaleString()}/mo`,
  ].filter(Boolean)
  return [parts.join(' '), filters.join(' · ')].filter(Boolean).join(' — ')
}
