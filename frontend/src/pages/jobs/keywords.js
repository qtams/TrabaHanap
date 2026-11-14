import { ALL_SKILLS } from '../../data/skills.js'

// Search keywords are short skills. Resumes often list sentences ("Proficient in React and Laravel"),
// so those become the skills they name, or their key words. The backend does the same (JobFinder::shortKeyword).

const FILLER = /^((proficient|experienced|skilled|strong|good|excellent|basic|advanced|working|hands-on|solid|knowledge|familiarity|familiar|expertise|ability)( (in|with|of|at|to))?|building|using|developing|creating|managing|handling)\s+/i
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const KNOWN = ALL_SKILLS.filter((s) => s.length > 2).sort((a, b) => b.length - a.length) // longest first

/** One skill as a short keyword: "JavaScript (ES6+)" → "JavaScript", a sentence → its first key words. */
export function shortKeyword(skill) {
  let k = (skill ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim()
  k = k.split(/\s*[:;,|–—]\s*|\s+-\s+/)[0].trim()
  if (k.length > 30) {
    k = k.replace(FILLER, '').replace(FILLER, '')
    k = k.split(/\s+(?:and|&|or)\s+/i)[0].trim()
  }
  if (k.length > 30) k = k.split(/\s+/).slice(0, 3).join(' ')
  return k.slice(0, 60)
}

/**
 * Keywords from a skill: short ones as they are (cleaned), long ones as the known skills they mention
 * ("Proficient in React and Laravel" → React, Laravel), else their key words.
 */
export function keywordsFrom(skill) {
  const clean = shortKeyword(skill)
  if ((skill ?? '').trim().length <= 30) return clean ? [clean] : []
  const named = KNOWN.filter((s) => new RegExp(`(?<![\\w.+#])${escape(s)}(?![\\w+#])`, 'i').test(skill))
  return named.length ? named.slice(0, 3) : clean ? [clean] : []
}
