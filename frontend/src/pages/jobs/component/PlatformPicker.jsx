import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiChevronDown, FiExternalLink } from 'react-icons/fi'
import { EXTERNAL } from '../labels.js'

function Option({ checked, onToggle, label, note, external }) {
  return (
    <button type="button" role="menuitemcheckbox" aria-checked={checked} onClick={onToggle} className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-hover">
      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${checked ? 'border-ink bg-ink text-on-ink' : 'border-line'}`}>
        {checked && <FiCheck className="text-[11px]" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[13px]">{label}{external && <FiExternalLink className="text-[11px] text-subtle" />}</span>
        {note && <span className="block text-[12px] leading-snug text-muted">{note}</span>}
      </span>
    </button>
  )
}

// Dropdown of job platforms: the ones searched here, plus boards we can only link to.
export default function PlatformPicker({ value, onChange, sources }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const all = [...sources.map((s) => s.key), ...EXTERNAL.map((e) => e.key)]
  const allOn = all.every((k) => value.includes(k))
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])

  useEffect(() => {
    if (!open) return
    const close = (e) => (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const label = allOn ? 'All platforms' : value.length === 0 ? 'No platforms' : `${value.length} of ${all.length} platforms`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-[13px] hover:bg-hover"
      >
        {label} <FiChevronDown className={`text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="drop-in absolute left-0 z-20 mt-1.5 w-[min(320px,calc(100vw-32px))] rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          <Option checked={allOn} onToggle={() => onChange(allOn ? [] : all)} label={<span className="font-medium">All platforms</span>} />
          <div className="my-1 border-t border-line" />
          <p className="px-2 pt-1 pb-0.5 text-[11px] font-medium tracking-wide text-subtle uppercase">Searched in TrabaHanap</p>
          {sources.map((s) => <Option key={s.key} checked={value.includes(s.key)} onToggle={() => toggle(s.key)} label={s.name} note={s.note} />)}
          <p className="px-2 pt-2 pb-0.5 text-[11px] font-medium tracking-wide text-subtle uppercase">Opens their site</p>
          {EXTERNAL.map((e) => <Option key={e.key} checked={value.includes(e.key)} onToggle={() => toggle(e.key)} label={e.name} note={e.note} external />)}
        </div>
      )}
    </div>
  )
}
