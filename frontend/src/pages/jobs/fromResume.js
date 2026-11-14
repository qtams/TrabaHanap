import { emptySearch } from './labels.js'

// Search terms match every word, so keep them short: one clean title, one main skill.
const SENIORITY = /\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|intern|trainee|i{1,3}|iv)\b/gi
const POPULAR = /^(react|vue|angular|svelte|next|nuxt|laravel|django|flask|spring|rails|node|express|flutter|\.net|wordpress|shopify)/i

const cleanTitle = (t) => (t ?? '').replace(SENIORITY, '').replace(/\s{2,}/g, ' ').trim()
// "React.js" → "React", "JavaScript (ES6+)" → "JavaScript".
const cleanSkill = (s) => (s ?? '').replace(/\(.*?\)/g, '').replace(/\.js$/i, '').trim()
const filled = (p) => p && Object.values(p).some((v) => (Array.isArray(v) ? v.length : v))

/**
 * Search form pre-filled from the candidate's own information: the Professional Profile first
 * (preferences, then latest job), else the most recent resume. Returns { form, basedOn }, or null
 * when there's nothing to go on.
 */
export function searchFromResume({ profile, resume, sources }) {
  const prefs = profile?.preferences ?? {}
  const p = filled(profile?.experience?.[0]) ? profile : null
  const r = resume?.data

  const title = cleanTitle(prefs.job_titles?.[0] || p?.experience[0].title || r?.professional_title || r?.work_experience?.[0]?.position)
  if (!title) return null

  const skills = [
    ...(profile ? Object.values(profile.skills ?? {}).flat() : []),
    ...(r?.technical_skills ?? []),
  ].map(cleanSkill).filter(Boolean)
  const keyword = skills.find((s) => POPULAR.test(s)) ?? ''

  const place = prefs.locations?.[0] || profile?.personal?.location || r?.contact?.location || ''
  const location = /philippines|manila|metro|pasig|makati|taguig|quezon|cebu|davao|ph\b/i.test(place) || !place ? 'Philippines' : place

  const form = {
    ...emptySearch(sources),
    title,
    keywords: keyword,
    location,
    work_setups: prefs.work_setups ?? [],
    employment_types: prefs.employment_types ?? [],
    levels: prefs.experience_level ? [prefs.experience_level] : [],
    salary_min: prefs.salary_min ?? null,
    salary_max: prefs.salary_max ?? null,
    salary_currency: prefs.salary_currency || 'PHP',
  }
  const basedOn = prefs.job_titles?.length || p ? 'your Professional Profile' : `your resume “${resume.title}”`

  return { form, basedOn }
}
