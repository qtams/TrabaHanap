import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'

/**
 * A panel that slides in from the right over the whole screen (portal, so page animations can't
 * trap it). Escape or a click on the backdrop closes it; the page behind doesn't scroll.
 * Footer: optional `footer` content, a Cancel button when onCancel is given, and the main button
 * (primaryLabel / onPrimary, default "Done" that closes).
 */
export default function SidePanel({
  title, description, onClose, children, footer, width = 'max-w-[480px]',
  primaryLabel = 'Done', onPrimary, primaryDisabled = false, onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in absolute inset-0 bg-black/25 dark:bg-black/50" />
      <aside className={`slide-in relative flex h-full w-full ${width} flex-col border-l border-line bg-surface shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink">
            <FiX />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        <footer className="flex items-center justify-end gap-3 border-t border-line px-6 py-3">
          {footer}
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-[13px] text-muted hover:bg-hover hover:text-ink">Cancel</button>
          )}
          <button type="button" onClick={onPrimary ?? onClose} disabled={primaryDisabled} className="rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-40">
            {primaryLabel}
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
