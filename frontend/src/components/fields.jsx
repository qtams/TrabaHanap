import { useState } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'

// Small form controls for the profile page. All are controlled: value + onChange(newValue).

const INPUT =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-subtle focus:border-subtle'

// group: the field holds several controls (chips, pickers). A <label> would forward clicks on its
// text to the first button inside, so those use a plain wrapper.
// error: a message from the server; the field's inputs get a red border and the message shows below.
export function Field({ label, hint, children, className = '', group = false, error }) {
  const Tag = group ? 'div' : 'label'
  const red = error ? '[&_input]:border-red-500 [&_select]:border-red-500 [&_textarea]:border-red-500' : ''
  return (
    <Tag className={`block ${className} ${red}`} data-error={error ? 'true' : undefined}>
      <span className={`text-[13px] font-medium ${error ? 'text-red-600 dark:text-red-400' : ''}`}>{label}</span>
      {hint && <span className="ml-1.5 text-[12px] text-subtle">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className="drop-in mt-1 block text-[12px] text-red-600 dark:text-red-400">{error}</span>}
    </Tag>
  )
}

export function Text({ value, onChange, ...props }) {
  return <input {...props} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT} />
}

export function TextArea({ value, onChange, rows = 3, ...props }) {
  return <textarea {...props} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`${INPUT} resize-y`} />
}

export function Select({ value, onChange, options, placeholder = 'Select…' }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}

// Toggle buttons for a multi-choice list, e.g. Remote / Hybrid / Onsite.
export function Choices({ value = [], onChange, options }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(options).map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => toggle(v)}
          aria-pressed={value.includes(v)}
          className={`rounded-md border px-2.5 py-1 text-[13px] transition-colors ${
            value.includes(v) ? 'border-ink bg-ink text-on-ink' : 'border-line text-muted hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Chips. Enter or comma adds, Backspace on an empty input removes the last one.
export function Tags({ value = [], onChange, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const items = draft.split(',').map((s) => s.trim()).filter(Boolean)
    const fresh = items.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    if (fresh.length) onChange([...value, ...fresh])
    setDraft('')
  }

  return (
    <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5 focus-within:border-subtle">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-hover py-0.5 pr-1 pl-2 text-[12px]">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded p-0.5 text-subtle hover:text-ink" aria-label={`Remove ${tag}`}>
            <FiX className="text-[11px]" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-subtle"
      />
    </div>
  )
}

// A list of sentences edited as a textarea, one item per line.
export function Lines({ value = [], onChange, rows = 4, placeholder }) {
  const [text, setText] = useState(value.join('\n'))
  const [prev, setPrev] = useState(value)
  const parse = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean)

  // Value replaced from outside (e.g. an import): show it. Our own edits keep the text as typed.
  if (value !== prev) {
    setPrev(value)
    if (parse(text).join('\n') !== value.join('\n')) setText(value.join('\n'))
  }

  return (
    <textarea
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
      className={`${INPUT} resize-y leading-relaxed`}
    />
  )
}

// A list of records (jobs, schools, projects…) with add and remove.
export function Repeater({ items, onChange, blank, addLabel, title, children }) {
  const update = (i, item) => onChange(items.map((x, j) => (j === i ? item : x)))

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-line p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="truncate text-[13px] font-medium">{title(item) || <span className="text-subtle">New entry</span>}</p>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="shrink-0 text-[12px] text-muted hover:text-red-600">
              Remove
            </button>
          </div>
          {children(item, (patch) => update(i, { ...item, ...patch }))}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, structuredClone(blank)])} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <FiPlus /> {addLabel}
      </button>
    </div>
  )
}
