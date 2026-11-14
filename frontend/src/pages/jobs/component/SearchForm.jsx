import { useState } from 'react'
import { FiLoader, FiSearch, FiSliders, FiUser } from 'react-icons/fi'
import { Choices, Field, Select, Text } from '../../../components/fields.jsx'
import { LEVELS, POSTED, SETUPS, TYPES, emptySearch } from '../labels.js'
import PlatformPicker from './PlatformPicker.jsx'

// A. search fields + B. filters. Controlled by the page (so history can refill it).
export default function SearchForm({ value, onChange, onSubmit, sources, busy, suggested, onUseSuggested }) {
  const [showFilters, setShowFilters] = useState(false)
  const set = (patch) => onChange({ ...value, ...patch })
  const number = (v) => (v === '' ? null : Number(v))
  const activeFilters = ['work_setups', 'employment_types', 'levels'].reduce((n, k) => n + value[k].length, 0)
    + (value.posted_within ? 1 : 0) + (value.salary_min || value.salary_max ? 1 : 0)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-4 rounded-lg border border-line p-4"
    >
      {suggested && (
        <p className="flex items-center gap-1.5 text-[12px] text-muted">
          <FiUser className="shrink-0" /> Filled in from {suggested.basedOn}. Change anything and search again.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Job title"><Text value={value.title} onChange={(v) => set({ title: v })} placeholder="e.g. Frontend Developer" /></Field>
        <Field label="Keywords"><Text value={value.keywords} onChange={(v) => set({ keywords: v })} placeholder="e.g. React, Laravel" /></Field>
        <Field label="Location"><Text value={value.location} onChange={(v) => set({ location: v })} placeholder="e.g. Philippines" /></Field>
        <Field label="Company"><Text value={value.company} onChange={(v) => set({ company: v })} placeholder="e.g. GitLab" /></Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-50">
          {busy ? <FiLoader className="animate-spin" /> : <FiSearch />} Search
        </button>
        <PlatformPicker value={value.sources} onChange={(v) => set({ sources: v })} sources={sources} />
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-[13px] hover:bg-hover"
        >
          <FiSliders /> Filters{activeFilters ? ` (${activeFilters})` : ''}
        </button>
        <button type="button" onClick={() => onChange(emptySearch(sources))} className="px-2 py-2 text-[13px] text-muted hover:text-ink">
          Clear
        </button>
        {suggested && (
          <button type="button" onClick={onUseSuggested} disabled={busy} className="px-2 py-2 text-[13px] text-muted hover:text-ink disabled:opacity-50">
            Fill from my resume
          </button>
        )}
      </div>

      {showFilters && (
        <div className="drop-in grid gap-4 border-t border-line pt-4 md:grid-cols-2">
          <Field group label="Work setup"><Choices value={value.work_setups} onChange={(v) => set({ work_setups: v })} options={SETUPS} /></Field>
          <Field group label="Employment type"><Choices value={value.employment_types} onChange={(v) => set({ employment_types: v })} options={TYPES} /></Field>
          <Field group label="Experience level"><Choices value={value.levels} onChange={(v) => set({ levels: v })} options={LEVELS} /></Field>
          <Field label="Date posted"><Select value={value.posted_within} onChange={(v) => set({ posted_within: v })} options={POSTED} placeholder="Any time" /></Field>
          <Field label="Salary range" hint="monthly" className="md:col-span-2">
            <div className="grid grid-cols-[1fr_1fr_100px] gap-2">
              <Text type="number" min="0" step="1000" value={value.salary_min ?? ''} onChange={(v) => set({ salary_min: number(v) })} placeholder="Minimum" aria-label="Minimum salary" />
              <Text type="number" min="0" step="1000" value={value.salary_max ?? ''} onChange={(v) => set({ salary_max: number(v) })} placeholder="Maximum" aria-label="Maximum salary" />
              <Select value={value.salary_currency} onChange={(v) => set({ salary_currency: v })} options={{ PHP: 'PHP', USD: 'USD', EUR: 'EUR', GBP: 'GBP' }} placeholder="—" />
            </div>
            <p className="mt-1.5 text-[12px] text-muted">Hides jobs whose stated pay (same currency, converted to monthly) is outside the range. Jobs that don&apos;t state pay stay.</p>
          </Field>
        </div>
      )}
    </form>
  )
}
