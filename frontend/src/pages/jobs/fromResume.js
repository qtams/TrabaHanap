import { keywordsFrom } from './keywords.js'
import { emptySearch } from './labels.js'

// Search terms match every word, so keep them short: clean titles, at most one main skill.
const SENIORITY = /\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|intern|trainee|i{1,3}|iv)\b/gi
const POPULAR = /^(react|vue|angular|svelte|next|nuxt|laravel|django|flask|spring|rails|node|express|flutter|\.net|wordpress|shopify)/i
const PH_PLACE = /philippines|manila|metro|pasig|makati|taguig|quezon|cebu|davao|ph\b/i

const cleanTitle = (t) => (t ?? '').replace(SENIORITY, '').replace(/\s{2,}/g, ' ').trim()
// "React.js" → "React", "JavaScript (ES6+)" → "JavaScript".
const cleanSkill = (s) => (s ?? '').replace(/\(.*?\)/g, '').replace(/\.js$/i, '').trim()
const filled = (p) => p && Object.values(p).some((v) => (Array.isArray(v) ? v.length : v))

/**
 * Search form pre-filled from the candidate's own information: the Professional Profile first
 * (every preferred job title and location, then latest job), else the most recent resume.
 * Returns { form, basedOn }, or null when there's nothing to go on.
 */
export function searchFromResume({ profile, resume, sources }) {
  const prefs = profile?.preferences ?? {}
  const p = filled(profile?.experience?.[0]) ? profile : null
  const r = resume?.data

  // Every preferred job title (any of them matches), else the latest one they've held.
  const preferred = [...new Set((prefs.job_titles ?? []).map(cleanTitle).filter(Boolean))].slice(0, 5)
  const latest = cleanTitle(p?.experience[0].title || r?.professional_title || r?.work_experience?.[0]?.position)
  const titles = preferred.length ? preferred : [latest].filter(Boolean)
  if (!titles.length) return null

  // Keywords: their skills (a job mentioning any of them matches). Main frameworks and job skills first,
  // soft skills left out (every posting says "communication").
  const s = profile?.skills ?? {}
  const fromProfile = ['frameworks', 'programming_languages', 'other', 'backend', 'frontend', 'databases', 'tools'].flatMap((k) => s[k] ?? [])
  // Long resume phrases become the skills they name ("Proficient in React and Laravel" → React, Laravel).
  const seen = new Set()
  const skills = [...fromProfile, ...(r?.technical_skills ?? [])].flatMap(keywordsFrom).map(cleanSkill)
    .filter((k) => k && !seen.has(k.toLowerCase()) && seen.add(k.toLowerCase()))
  const keywords = [...skills.filter((x) => POPULAR.test(x)), ...skills.filter((x) => !POPULAR.test(x))].slice(0, 6)

  // Every preferred location, else their home (a Philippine address → the whole country).
  const home = profile?.personal?.location || r?.contact?.location || ''
  // The Philippines is always one of them: a job anywhere in the country is an opportunity too.
  const chosen = prefs.locations?.length ? prefs.locations.slice(0, 4) : [PH_PLACE.test(home) || !home ? 'Philippines' : home]
  const locations = chosen.some((l) => /philippines/i.test(l)) ? chosen : [...chosen, 'Philippines']

  const form = {
    ...emptySearch(sources),
    titles,
    keywords,
    locations,
    // Work setup, job type, level and salary preferences are NOT turned into filters: a filter hides
    // jobs, and preferences shouldn't silently do that (our sources are mostly remote). Set them in Filters.
    salary_currency: prefs.salary_currency || 'PHP',
  }
  const basedOn = preferred.length || p ? 'your Professional Profile' : `your resume “${resume.title}”`

  return { form, basedOn }
}
