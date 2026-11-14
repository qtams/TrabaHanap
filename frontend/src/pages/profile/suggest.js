// "Suggested for you" for the Professional Profile, from the candidate's own information only.
import { INDUSTRIES, JOB_TITLES, ROLE_INDUSTRIES } from '../../data/careers.js'
import { PH_LOCATIONS } from '../../data/phLocations.js'
import { ALL_SKILLS, RELATED, ROLE_SKILLS, SKILL_CATEGORY } from '../../data/skills.js'
import { norm } from '../../lib/match.js'

export const SKILL_LABELS = {
  programming_languages: 'Programming languages',
  frontend: 'Front-end development',
  backend: 'Back-end development',
  databases: 'Databases',
  frameworks: 'Frameworks & libraries',
  tools: 'Tools & software',
  soft_skills: 'Soft skills',
  other: 'Other professional skills',
}
export const categoryOf = (name) => SKILL_CATEGORY.get(norm(name)) ?? 'other'

// Names that are also everyday words; never "found" in text, only typed or suggested by role.
const AMBIGUOUS = new Set(['C', 'R', 'Go', 'Make', 'Cursor', 'Claude', 'Excel', 'Driving', 'Editing', 'Research', 'Communication', 'Sales'])
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole word, so "Go" doesn't match "good" and "Java" doesn't match "JavaScript".
const mentions = (text, name) => new RegExp(`(?<![\\w.+#])${escape(name)}(?![\\w+#])`, 'i').test(text)
const unique = (list, taken, limit) => [...new Set(list)].filter((x) => x && !taken.has(norm(x))).slice(0, limit)

const jobTitles = (p) => [...(p.experience ?? []).map((j) => j.title), ...(p.preferences?.job_titles ?? [])].filter(Boolean)
const allSkills = (p) => Object.values(p.skills ?? {}).flat()

/** Skills the experience mentions, then ones related to what they have, then common ones for their titles. */
export function suggestSkills(p, taken) {
  const jobs = p.experience ?? []
  const text = [
    p.summary?.introduction, p.summary?.career_objective,
    ...jobs.flatMap((j) => [j.title, ...(j.responsibilities ?? []), ...(j.achievements ?? []), ...(j.technologies ?? [])]),
    ...(p.projects ?? []).flatMap((x) => [x.description, ...(x.technologies ?? [])]),
  ].filter(Boolean).join('\n')
  const titles = jobTitles(p).join(' ')

  const found = ALL_SKILLS.filter((s) => !AMBIGUOUS.has(s) && mentions(text, s))
  const related = [...taken].flatMap((t) => RELATED[ALL_SKILLS.find((s) => norm(s) === t)] ?? [])
  const byRole = ROLE_SKILLS.filter(([re]) => re.test(titles)).flatMap(([, list]) => list)
  // "React" and "React.js" are the same skill.
  const loose = (s) => norm(s).replace(/\.js$/, '')
  const have = new Set([...taken].map(loose))
  return unique([...found, ...related, ...byRole], taken, 24).filter((s) => !have.has(loose(s))).slice(0, 12)
}

/** Listed skills a piece of text names (e.g. one job's bullets), for its "Technologies used". */
export function skillsIn(texts, taken = []) {
  const text = texts.filter(Boolean).join('\n')
  const have = new Set(taken.map((s) => norm(s).replace(/\.js$/, '')))
  return ALL_SKILLS.filter((s) => !AMBIGUOUS.has(s) && SKILL_CATEGORY.get(norm(s)) !== 'soft_skills' && mentions(text, s))
    .filter((s) => !have.has(norm(s).replace(/\.js$/, '')))
}

/** Titles they've held, then listed titles that share their title words or name one of their skills. */
export function suggestTitles(p, taken) {
  const held = jobTitles(p)
  const stop = new Set(['senior', 'junior', 'jr', 'sr', 'lead', 'and', 'of', 'the', 'i', 'ii', 'iii', 'intern'])
  const titleWords = new Set(held.flatMap((t) => t.toLowerCase().split(/[\s/,-]+/)).filter((w) => w.length > 1 && !stop.has(w)))
  const skills = allSkills(p).map((s) => s.toLowerCase().replace(/\.js$/, ''))

  const scored = JOB_TITLES.map((t) => {
    const lower = t.toLowerCase()
    const words = lower.split(/[\s/()-]+/)
    const score = words.filter((w) => titleWords.has(w)).length * 2 + skills.filter((s) => s.length > 2 && lower.includes(s)).length * 3
    return [t, score]
  }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([t]) => t)

  return unique([...held, ...scored], taken, 10)
}

/** Industries that usually hire people with their titles and skills. */
export function suggestIndustries(p, taken) {
  const about = [...jobTitles(p), ...allSkills(p)].join(' ')
  return unique(ROLE_INDUSTRIES.filter(([re]) => re.test(about)).flatMap(([, list]) => list), taken, 10)
}

const HUBS = ['Metro Manila', 'Makati', 'Bonifacio Global City (BGC)', 'Pasig', 'Quezon City', 'Ortigas Center', 'Cebu City', 'Davao City', 'Clark', 'Anywhere in the Philippines']
export const LOCATION_NAMES = PH_LOCATIONS.map(([n]) => n)
const AREA = new Map(PH_LOCATIONS.map(([n, a]) => [n, a]))
export const locationHint = (name) => AREA.get(name)

/** Places in their address first, then the main job hubs. */
export function suggestLocations(p, taken) {
  const home = p.personal?.location ?? ''
  const near = LOCATION_NAMES.filter((n) => n.length > 3 && mentions(home, n.replace(/ \(.*\)$/, '')))
  const inMetro = near.some((n) => AREA.get(n) === 'Metro Manila') ? ['Metro Manila'] : []
  return unique([...near, ...inMetro, ...HUBS], taken, 10)
}

export const INDUSTRY_NAMES = INDUSTRIES
export const TITLE_NAMES = JOB_TITLES
