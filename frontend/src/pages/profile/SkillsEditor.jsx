import { useMemo, useState } from 'react'
import { Chip, ComboInput } from '../../components/TagPicker.jsx'
import { ALL_SKILLS } from '../../data/skills.js'
import { norm, rankMatches } from '../../lib/match.js'
import { SKILL_LABELS, categoryOf, suggestSkills } from './suggest.js'

const grouped = (skills) => Object.entries(SKILL_LABELS).filter(([cat]) => skills[cat]?.length)

/** Read-only view of the skills on the page, by category. */
export function SkillsSummary({ skills }) {
  const groups = grouped(skills)
  if (!groups.length) return <p className="text-[13px] text-muted">No skills yet. Add them, or import them from your resume.</p>
  return (
    <div className="space-y-3">
      {groups.map(([cat, label]) => (
        <div key={cat}>
          <p className="text-[12px] text-muted">{label}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {skills[cat].map((s) => <li key={s} className="rounded-full bg-hover px-3 py-1 text-[13px]">{s}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Panel contents: one box to add any skill (suggestions as you type); each is filed under its category. */
export default function SkillsEditor({ skills, profile, onChange }) {
  const [query, setQuery] = useState('')
  const taken = useMemo(() => new Set(Object.values(skills).flat().map(norm)), [skills])
  const matches = useMemo(() => rankMatches(query, ALL_SKILLS, taken), [query, taken])
  const suggestions = useMemo(() => suggestSkills(profile, taken), [profile, taken])
  const canAddTyped = query.trim() && !taken.has(norm(query)) && !matches.some((m) => norm(m) === norm(query))
  const options = [
    ...matches.map((name) => ({ name, hint: SKILL_LABELS[categoryOf(name)] })),
    ...(canAddTyped ? [{ name: query.trim(), isNew: true, hint: SKILL_LABELS.other }] : []),
  ]

  const add = (name) => {
    const clean = name.trim()
    if (!clean || taken.has(norm(clean))) return
    const cat = categoryOf(clean)
    onChange({ ...skills, [cat]: [...(skills[cat] ?? []), ALL_SKILLS.find((s) => norm(s) === norm(clean)) ?? clean] })
    setQuery('')
  }
  const remove = (cat, name) => onChange({ ...skills, [cat]: skills[cat].filter((s) => s !== name) })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium">Add a skill</p>
        <div className="mt-1.5 flex gap-2">
          <ComboInput query={query} onQuery={setQuery} options={options} onPick={add} onEnter={add} label="Add a skill" placeholder="e.g. Customer Service, React, Bookkeeping" />
          <button type="button" onClick={() => add(query)} disabled={!query.trim()} className="rounded-md bg-ink px-4 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-40">
            Add
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-muted">Pick from the list or press Enter. Each skill is filed under its category for you.</p>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-[13px] font-medium">Suggested from your experience</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => <Chip key={s} tone="suggested" label={`Add ${s}`} onClick={() => add(s)}>{s}</Chip>)}
          </div>
        </div>
      )}

      <div>
        <p className="text-[13px] font-medium">Added skills <span className="font-normal text-muted">({taken.size})</span></p>
        {taken.size === 0 ? (
          <p className="mt-2 text-[13px] text-muted">No skills yet.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {grouped(skills).map(([cat, label]) => (
              <div key={cat}>
                <p className="text-[12px] text-muted">{label}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {skills[cat].map((s) => <Chip key={s} label={`Remove ${s}`} onClick={() => remove(cat, s)}>{s}</Chip>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
