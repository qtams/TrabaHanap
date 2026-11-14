import { useState } from 'react'
import { FiBriefcase, FiLoader, FiMapPin, FiRotateCcw, FiSearch, FiSliders, FiTag, FiUser, FiX } from 'react-icons/fi'
import { Choices, Field, Select, Text } from '../../../components/fields.jsx'
import SidePanel from '../../../components/SidePanel.jsx'
import { ChipInput } from '../../../components/TagPicker.jsx'
import { JOB_TITLES } from '../../../data/careers.js'
import { PH_LOCATIONS } from '../../../data/phLocations.js'
import { ALL_SKILLS } from '../../../data/skills.js'
import { shortKeyword } from '../keywords.js'
import { LEVELS, POSTED, SETUPS, TYPES, emptySearch } from '../labels.js'
import PlatformPicker from './PlatformPicker.jsx'

const PLACE_NAMES = PH_LOCATIONS.map(([n]) => n)
const PLACE_AREA = new Map(PH_LOCATIONS)
const money = (n, cur) => `${cur === 'PHP' ? '₱' : `${cur} `}${Number(n).toLocaleString()}`
const few = (list, n = 2) => (list.length > n ? `${list.slice(0, n).join(', ')} +${list.length - n}` : list.join(', '))

// The narrowing filters that are on, each with how to turn it off (removable chips under the bar).
function activeFilters(v) {
  const list = []
  for (const [key, labels] of [['work_setups', SETUPS], ['employment_types', TYPES], ['levels', LEVELS]]) {
    for (const item of v[key]) list.push({ id: `${key}:${item}`, label: labels[item], clear: { [key]: v[key].filter((x) => x !== item) } })
  }
  if (v.posted_within) list.push({ id: 'posted', label: POSTED[v.posted_within], clear: { posted_within: '' } })
  if (v.salary_min || v.salary_max) {
    const range = v.salary_min && v.salary_max
      ? `${money(v.salary_min, v.salary_currency)} – ${money(v.salary_max, v.salary_currency)}`
      : v.salary_min ? `${money(v.salary_min, v.salary_currency)}+` : `up to ${money(v.salary_max, v.salary_currency)}`
    list.push({ id: 'salary', label: `${range} / mo`, clear: { salary_min: null, salary_max: null } })
  }
  if (v.company) list.push({ id: 'company', label: `at ${v.company}`, clear: { company: '' } })
  return list
}

// One line of the summary: an icon, the values, opens the panel.
function SummaryPill({ icon: Icon, text, muted, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title} className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] hover:border-subtle ${muted ? 'text-subtle line-through' : 'text-ink'}`}>
      <Icon className="shrink-0 text-[11px] text-muted" /> <span className="truncate">{text}</span>
    </button>
  )
}

function FilterSection({ title, hint, children }) {
  return (
    <section className="space-y-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

// A. the search bar + summary, B. every filter in a panel on the right. Controlled by the page.
export default function SearchForm({ value, onChange, onSubmit, sources, busy, suggested }) {
  const [panel, setPanel] = useState(false)
  const set = (patch) => onChange({ ...value, ...patch })
  const number = (v) => (v === '' ? null : Number(v))
  const filters = activeFilters(value)
  const typed = value.query.trim() !== ''
  const filterCount = filters.length + value.titles.length + value.keywords.length + value.locations.length

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="flex flex-wrap gap-2"
      >
        <label className="flex h-11 min-w-0 flex-[1_1_320px] items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 focus-within:border-subtle">
          <FiSearch className="shrink-0 text-muted" />
          <input
            value={value.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={value.titles.length ? `Search a specific job, skill or company, or use your ${value.titles.length} job titles` : 'Search a job title, skill or company'}
            aria-label="Search jobs"
            className="h-full w-full bg-transparent text-[14px] outline-none placeholder:text-subtle"
          />
          {typed && (
            <button type="button" onClick={() => set({ query: '' })} aria-label="Clear search" className="rounded p-0.5 text-subtle hover:text-ink">
              <FiX />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setPanel(true)}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[13px] hover:bg-hover"
        >
          <FiSliders /> Filters
          {filterCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-medium text-on-ink tabular-nums">{filterCount}</span>}
        </button>
        <PlatformPicker value={value.sources} onChange={(v) => set({ sources: v })} sources={sources} />
        <button disabled={busy} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-ink px-4 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-50">
          {busy ? <FiLoader className="animate-spin" /> : <FiSearch />} Search
        </button>
      </form>

      {/* What the search uses, at a glance. Click a group to change it. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {suggested && <span className="inline-flex items-center gap-1 text-[12px] text-subtle"><FiUser className="text-[11px]" /> From your profile:</span>}
        {value.titles.length > 0 && (
          <SummaryPill icon={FiBriefcase} text={few(value.titles)} muted={typed} onClick={() => setPanel(true)} title={typed ? 'Not used while you search for something specific' : 'Job titles'} />
        )}
        {value.locations.length > 0 && <SummaryPill icon={FiMapPin} text={few(value.locations)} onClick={() => setPanel(true)} title="Locations" />}
        {value.keywords.length > 0 && <SummaryPill icon={FiTag} text={few(value.keywords, 3)} onClick={() => setPanel(true)} title="Keywords" />}
        {filters.map((f) => (
          <button key={f.id} type="button" onClick={() => set(f.clear)} aria-label={`Remove filter ${f.label}`} className="drop-in group inline-flex items-center gap-1 rounded-full bg-hover py-1 pr-1.5 pl-2.5 text-[12px] hover:bg-line">
            {f.label} <FiX className="text-[11px] text-subtle group-hover:text-ink" />
          </button>
        ))}
      </div>

      {panel && (
        <SidePanel
          title="Filters"
          description="Filled in from your Professional Profile. Changes here only affect this search; your profile stays the same."
          onClose={() => setPanel(false)}
          primaryLabel="Show jobs"
          onPrimary={() => { setPanel(false); onSubmit() }}
          width="max-w-[520px]"
          footer={(
            <span className="mr-auto flex gap-1">
              {suggested && (
                <button type="button" onClick={() => onChange({ ...suggested.form, query: value.query })} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] text-muted hover:bg-hover hover:text-ink">
                  <FiRotateCcw className="text-[12px]" /> Reset to my profile
                </button>
              )}
              <button type="button" onClick={() => onChange({ ...emptySearch(sources), query: value.query })} className="rounded-md px-2.5 py-2 text-[13px] text-muted hover:bg-hover hover:text-ink">
                Clear all
              </button>
            </span>
          )}
        >
          <div className="space-y-6">
            <FilterSection title="Job titles" hint={typed ? `Not used while you search for “${value.query.trim()}”. Clear the search box to use them.` : 'A job with any of these titles matches.'}>
              <ChipInput value={value.titles} onChange={(v) => set({ titles: v })} names={JOB_TITLES} placeholder="e.g. Frontend Developer" label="Job titles" />
            </FilterSection>

            <FilterSection title="Locations" hint="Any of these places. The Philippines is always included, and remote jobs open to everyone count too.">
              <ChipInput value={value.locations} onChange={(v) => set({ locations: v })} names={PLACE_NAMES} hintOf={(n) => PLACE_AREA.get(n)} placeholder="e.g. Makati, Cebu City" label="Locations" />
            </FilterSection>

            <FilterSection title="Keywords" hint="Your skills. They never hide jobs: each job shows which of your skills it mentions. With no job titles, they decide the search.">
              <ChipInput value={value.keywords} onChange={(v) => set({ keywords: v })} names={ALL_SKILLS} max={15} normalize={shortKeyword} placeholder="e.g. React, Customer Service" label="Keywords" />
            </FilterSection>

            <FilterSection title="Job details">
              <Field group label="Work setup"><Choices value={value.work_setups} onChange={(v) => set({ work_setups: v })} options={SETUPS} /></Field>
              <Field group label="Employment type"><Choices value={value.employment_types} onChange={(v) => set({ employment_types: v })} options={TYPES} /></Field>
              <Field group label="Experience level"><Choices value={value.levels} onChange={(v) => set({ levels: v })} options={LEVELS} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Date posted"><Select value={value.posted_within} onChange={(v) => set({ posted_within: v })} options={POSTED} placeholder="Any time" /></Field>
                <Field label="Company" hint="optional"><Text value={value.company} onChange={(v) => set({ company: v })} placeholder="e.g. GitLab" /></Field>
              </div>
            </FilterSection>

            <FilterSection title="Salary" hint="Monthly. Hides jobs whose stated pay is outside the range; jobs that don't state pay stay.">
              <div className="grid grid-cols-[1fr_1fr_90px] gap-2">
                <Text type="number" min="0" step="1000" value={value.salary_min ?? ''} onChange={(v) => set({ salary_min: number(v) })} placeholder="Minimum" aria-label="Minimum salary" />
                <Text type="number" min="0" step="1000" value={value.salary_max ?? ''} onChange={(v) => set({ salary_max: number(v) })} placeholder="Maximum" aria-label="Maximum salary" />
                <Select value={value.salary_currency} onChange={(v) => set({ salary_currency: v })} options={{ PHP: 'PHP', USD: 'USD', EUR: 'EUR', GBP: 'GBP' }} placeholder="—" />
              </div>
              {(value.salary_min || value.salary_max) && (
                <button type="button" onClick={() => set({ salary_min: null, salary_max: null })} className="drop-in inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink">
                  <FiX className="text-[11px]" /> Remove salary range
                </button>
              )}
            </FilterSection>
          </div>
        </SidePanel>
      )}
    </div>
  )
}
