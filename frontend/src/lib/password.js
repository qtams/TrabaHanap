// Password rules shared by My account and the Users form.
// Required by the backend (Password::min(8)->letters()->numbers()), then extras that make it stronger.
export const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8, required: true },
  { key: 'letter', label: 'A letter', test: (p) => /[a-z]/i.test(p), required: true },
  { key: 'number', label: 'A number', test: (p) => /\d/.test(p), required: true },
  { key: 'case', label: 'Upper and lower case', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'symbol', label: 'A symbol, like ! @ # ?', test: (p) => /[^a-z0-9]/i.test(p) },
  { key: 'long', label: '12 characters or more', test: (p) => p.length >= 12 },
]
/** Whether a password meets the backend's rules (use to enable Save). */
export const passwordAccepted = (p) => RULES.filter((r) => r.required).every((r) => r.test(p))

// 0–4: 0 until the required rules pass, then one step per extra.
export function score(p) {
  if (!p) return 0
  if (!passwordAccepted(p)) return 1
  return Math.min(4, 2 + RULES.filter((r) => !r.required && r.test(p)).length - (p.length < 10 ? 1 : 0))
}

