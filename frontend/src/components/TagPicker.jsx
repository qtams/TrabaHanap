import { useId, useMemo, useState } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'
import { norm, rankMatches } from '../lib/match.js'

export function Chip({ children, onClick, label, tone = 'added' }) {
  const Icon = tone === 'suggested' ? FiPlus : FiX
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group inline-flex items-center gap-1.5 rounded-full py-1 pr-2 pl-3 text-[13px] transition-colors ${
        tone === 'suggested' ? 'border border-dashed border-line text-muted hover:border-subtle hover:text-ink' : 'bg-hover text-ink hover:bg-line'
      }`}
    >
      {children}
      <Icon className="text-[12px] text-subtle group-hover:text-ink" />
    </button>
  )
}

/**
 * Text box with a suggestion list under it (combobox). options: [{ name, hint, isNew }].
 * Enter picks the highlighted option; without one, onEnter gets the typed text.
 */
export function ComboInput({ query, onQuery, options, onPick, onEnter, placeholder, label }) {
  const id = useId()
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const shown = open && options.length > 0

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + options.length) % Math.max(options.length, 1))
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (shown && options[active]) onPick(options[active].name)
      else onEnter?.(query)
      setActive(0)
    } else if (e.key === 'Escape' && shown) {
      e.stopPropagation() // close the list, not the panel
      setOpen(false)
    }
  }

  return (
    <div className="relative flex-1">
      <input
        aria-label={label}
        role="combobox"
        aria-expanded={shown}
        aria-controls={id}
        aria-activedescendant={shown ? `${id}-${active}` : undefined}
        autoComplete="off"
        value={query}
        onChange={(e) => { onQuery(e.target.value); setActive(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 pr-8 text-[13px] outline-none placeholder:text-subtle focus:border-subtle"
      />
      {query && (
        <button type="button" onClick={() => onQuery('')} aria-label="Clear" className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-ink">
          <FiX className="text-[13px]" />
        </button>
      )}
      {shown && (
        <ul id={id} role="listbox" className="drop-in absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
          {options.map((o, i) => (
            <li
              key={o.name}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); onPick(o.name); setActive(0) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] ${i === active ? 'bg-hover' : ''}`}
            >
              <span className="truncate">{o.isNew ? <>Add “{o.name}”</> : o.name}</span>
              {o.hint && <span className="shrink-0 text-[11px] text-subtle">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Compact version for inside a form: chips with ×, a search box with matches from `names`, and a
 * row of one-click suggestions. Anything typed can be added.
 */
export function InlineTags({ value, onChange, names, hintOf, suggestions = [], placeholder, label }) {
  const [query, setQuery] = useState('')
  const taken = useMemo(() => new Set(value.map(norm)), [value])
  const matches = useMemo(() => rankMatches(query, names, taken, 6), [query, names, taken])
  const canAddTyped = query.trim() && !taken.has(norm(query)) && !matches.some((m) => norm(m) === norm(query))
  const options = [
    ...matches.map((name) => ({ name, hint: hintOf?.(name) })),
    ...(canAddTyped ? [{ name: query.trim(), isNew: true }] : []),
  ]
  const suggested = suggestions.filter((s) => !taken.has(norm(s))).slice(0, 8)

  const add = (name) => {
    const clean = name.trim()
    if (!clean || taken.has(norm(clean))) return
    onChange([...value, names.find((n) => norm(n) === norm(clean)) ?? clean])
    setQuery('')
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => <Chip key={v} label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>{v}</Chip>)}
        </div>
      )}
      <ComboInput query={query} onQuery={setQuery} options={options} onPick={add} onEnter={add} placeholder={placeholder} label={label} />
      {suggested.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-subtle">Suggested:</span>
          {suggested.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-0.5 text-[12px] text-muted hover:border-subtle hover:text-ink">
              <FiPlus className="text-[11px]" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Pick several items from a list: type to search, click suggestions, remove with ×.
 * names: the list to search; hintOf(name): grey text beside a match; allowCustom: typed text not in
 * the list can be added too.
 */
export default function TagPicker({
  value, onChange, names, hintOf, suggestions = [], allowCustom = true,
  label, placeholder, suggestedLabel = 'Suggested for you', addedLabel = 'Added', emptyText, help,
}) {
  const [query, setQuery] = useState('')
  const taken = useMemo(() => new Set(value.map(norm)), [value])
  const matches = useMemo(() => rankMatches(query, names, taken), [query, names, taken])
  const exact = names.find((n) => norm(n) === norm(query))
  const canAddTyped = allowCustom && query.trim() && !taken.has(norm(query)) && !exact
  const options = [
    ...matches.map((name) => ({ name, hint: hintOf?.(name) })),
    ...(canAddTyped ? [{ name: query.trim(), isNew: true }] : []),
  ]
  const suggested = suggestions.filter((s) => !taken.has(norm(s)))

  const add = (name) => {
    const clean = name.trim()
    const listed = names.find((n) => norm(n) === norm(clean)) // keep the list's spelling
    if (!clean || taken.has(norm(clean)) || (!listed && !allowCustom)) return
    onChange([...value, listed ?? clean])
    setQuery('')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <div className="mt-1.5 flex gap-2">
          <ComboInput query={query} onQuery={setQuery} options={options} onPick={add} onEnter={add} placeholder={placeholder} label={label} />
          <button type="button" onClick={() => add(exact ?? (allowCustom ? query : matches[0] ?? ''))} disabled={!query.trim()} className="rounded-md bg-ink px-4 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-40">
            Add
          </button>
        </div>
        {help && <p className="mt-1.5 text-[12px] text-muted">{help}</p>}
      </div>

      {suggested.length > 0 && (
        <div>
          <p className="text-[13px] font-medium">{suggestedLabel}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggested.map((s) => <Chip key={s} tone="suggested" label={`Add ${s}`} onClick={() => add(s)}>{s}</Chip>)}
          </div>
        </div>
      )}

      <div>
        <p className="text-[13px] font-medium">{addedLabel} <span className="font-normal text-muted">({value.length})</span></p>
        {value.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.map((v) => <Chip key={v} label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>{v}</Chip>)}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted">{emptyText ?? 'Nothing added yet.'}</p>
        )}
      </div>
    </div>
  )
}
