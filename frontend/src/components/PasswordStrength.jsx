import { FiCheck } from 'react-icons/fi'
import { RULES, score } from '../lib/password.js'

const LEVELS = [
  { label: 'Too weak', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { label: 'Weak', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-700 dark:text-lime-400' },
  { label: 'Strong', bar: 'bg-online', text: 'text-green-700 dark:text-green-400' },
]

/** Strength bar + live checklist under a new-password field. confirm: the repeat field, to show a match row. */
export default function PasswordStrength({ password, confirm }) {
  if (!password) return null
  const level = LEVELS[score(password)]
  const filledBars = score(password)
  const rows = [...RULES, ...(confirm !== undefined && confirm !== '' ? [{ key: 'match', label: 'Both passwords match', test: () => password === confirm, required: true }] : [])]

  return (
    <div className="drop-in mt-2.5 space-y-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1 rounded-full transition-colors duration-300 ${i <= filledBars ? level.bar : 'bg-line'}`} />
          ))}
        </div>
        <span className={`w-16 text-right text-[12px] font-medium ${level.text}`}>{level.label}</span>
      </div>
      <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {rows.map((r) => {
          const ok = r.test(password)
          return (
            <li key={r.key} className={`flex items-center gap-2 text-[12px] transition-colors ${ok ? 'text-ink' : 'text-muted'}`}>
              <span className={`grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-200 ${ok ? 'bg-online text-white' : 'border border-line'}`}>
                {/* key flips with ok, so the check re-mounts and drops in when a rule is met */}
                {ok && <FiCheck key="ok" className="drop-in text-[10px]" strokeWidth={3} />}
              </span>
              {r.label}
              {!r.required && <span className="text-[11px] text-subtle">optional</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
