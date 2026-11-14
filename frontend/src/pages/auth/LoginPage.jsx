import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiEye, FiEyeOff, FiLoader } from 'react-icons/fi'
import * as authApi from '../../api/auth.js'
import { errorMessage } from '../../api/resumes.js'
import { useAuth } from '../../auth/context.js'
import ThemeToggle from '../../components/ThemeToggle.jsx'

const INPUT = 'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[14px] outline-none placeholder:text-subtle focus:border-subtle'

export default function LoginPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const [form, setForm] = useState({ login: '', password: '', remember: true })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to={from} replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setUser(await authApi.login(form.login.trim(), form.password, form.remember))
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="drop-in w-full max-w-[360px]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-ink text-[14px] font-semibold text-on-ink">T</span>
          <span className="text-[15px] font-semibold tracking-tight">TrabaHanap</span>
        </div>
        <h1 className="mt-8 text-[22px] font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13px] text-muted">Your job search, in one place.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <p role="alert" className="drop-in flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
          <label className="block">
            <span className="text-[13px] font-medium">Username or email</span>
            <input
              autoFocus
              required
              autoComplete="username"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium">Password</span>
            <span className="relative mt-1.5 block">
              <input
                required
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`${INPUT} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded text-subtle hover:text-ink"
              >
                {show ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} className="size-3.5 accent-current" />
            Keep me signed in
          </label>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[14px] font-medium text-on-ink hover:opacity-85 disabled:opacity-60">
            {busy && <FiLoader className="animate-spin" />} Sign in
          </button>
        </form>

        <p className="mt-6 text-[12px] text-subtle">No account? Ask your TrabaHanap administrator to create one.</p>
      </div>
    </div>
  )
}
