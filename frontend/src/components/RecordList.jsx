import { useState } from 'react'
import { FiEdit2, FiExternalLink, FiPlus, FiTrash2 } from 'react-icons/fi'
import { confirm } from '../lib/alerts.js'
import SidePanel from './SidePanel.jsx'

/**
 * A list of records (certifications, projects…) shown as cards; Add and Edit open a side panel with
 * the form. Edits happen on a copy, so Cancel leaves the list untouched.
 *
 * describe(item) → { title, subtitle, meta, link } for the card.
 * isValid(item) → whether Save is allowed (e.g. a name is filled in).
 * children(draft, update) → the form fields; update(patch) merges into the draft.
 * addAt: 'end' (default) or 'start' for newest-first lists like work experience.
 * errors: { index: [messages] } from a failed save; those cards get a red border and the messages.
 */
export default function RecordList({
  items, onChange, blank, noun, describe, isValid = () => true, panelDescription, panelWidth, addAt = 'end', errors = {}, children,
}) {
  const [editing, setEditing] = useState(null) // { index: number | null (new), draft }
  const close = () => setEditing(null)

  const save = () => {
    const { index, draft } = editing
    const added = addAt === 'start' ? [draft, ...items] : [...items, draft]
    onChange(index === null ? added : items.map((x, i) => (i === index ? draft : x)))
    close()
  }

  const remove = async (index) => {
    const { title } = describe(items[index])
    if (await confirm({ title: `Remove this ${noun}?`, text: title || undefined, confirmText: 'Remove', tone: 'danger' })) {
      onChange(items.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const { title, subtitle, meta, link } = describe(item)
        return (
          <article key={i} data-error={errors[i] ? 'true' : undefined} className={`group flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${errors[i] ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-line hover:border-subtle'}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{title || <span className="text-subtle">Untitled {noun}</span>}</p>
              {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
              {errors[i]?.map((m) => <p key={m} className="drop-in mt-1 text-[12px] text-red-600 dark:text-red-400">{m} Click edit to fix it.</p>)}
              {(meta || link) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-subtle">
                  {meta}
                  {link && (
                    <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                      View <FiExternalLink className="text-[11px]" />
                    </a>
                  )}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1 opacity-70 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => setEditing({ index: i, draft: structuredClone(item) })} aria-label={`Edit ${title}`} className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink">
                <FiEdit2 className="text-[13px]" />
              </button>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${title}`} className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-red-600">
                <FiTrash2 className="text-[13px]" />
              </button>
            </div>
          </article>
        )
      })}

      <button
        type="button"
        onClick={() => setEditing({ index: null, draft: structuredClone(blank) })}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-4 py-3 text-[13px] text-muted transition-colors hover:border-subtle hover:text-ink"
      >
        <FiPlus /> Add {noun}
      </button>

      {editing && (
        <SidePanel
          title={editing.index === null ? `Add ${noun}` : `Edit ${noun}`}
          description={panelDescription}
          onClose={close}
          onCancel={close}
          primaryLabel={editing.index === null ? 'Add' : 'Save'}
          onPrimary={save}
          primaryDisabled={!isValid(editing.draft)}
          {...(panelWidth && { width: panelWidth })}
        >
          <div className="space-y-4">
            {children(editing.draft, (patch) => setEditing((e) => ({ ...e, draft: { ...e.draft, ...patch } })))}
          </div>
        </SidePanel>
      )}
    </div>
  )
}
