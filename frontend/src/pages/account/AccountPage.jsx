import { useState } from 'react'
import { FiEye, FiEyeOff, FiLoader, FiLock } from 'react-icons/fi'
import * as authApi from '../../api/auth.js'
import { errorMessage } from '../../api/resumes.js'
import { useAuth } from '../../auth/context.js'
import { Field, Text } from '../../components/fields.jsx'
import PasswordStrength from '../../components/PasswordStrength.jsx'
import { passwordAccepted } from '../../lib/password.js'
import { toast } from '../../lib/toast.js'

const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—')
const lower = (s) => (s ?? '').trim().toLowerCase()

function PasswordInput({ value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative block">
      <Text id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded text-subtle hover:text-ink">
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </span>
  )
}

// Settings-style block: title and explanation on the left, the form card on the right.
function Block({ title, description, children, footer }) {
  return (
    <section className="grid gap-4 border-t border-line pt-8 md:grid-cols-[220px_1fr] md:gap-10">
      <div>
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="rounded-lg border border-line">
        <div className="space-y-4 p-5">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-line bg-hover/40 px-5 py-3">{footer}</div>
      </div>
    </section>
  )
}

const SaveButton = ({ busy, disabled, onClick, children }) => (
  <button type="button" onClick={onClick} disabled={disabled || busy} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-1.5 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-40">
    {busy && <FiLoader className="animate-spin" />} {children}
  </button>
)
const fieldError = (errors, k) => errors[k]?.[0] && <p className="drop-in mt-1 text-[12px] text-red-600 dark:text-red-400">{errors[k][0]}</p>

/** "My account": the signed-in user's name, username, email and password. */
export default function AccountPage() {
  const { user, setUser } = useAuth()

  // Profile card
  const [profile, setProfile] = useState({ name: user.name, username: user.username, email: user.email })
  const [profilePassword, setProfilePassword] = useState('')
  const [profileErrors, setProfileErrors] = useState({})
  // Password card
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [busy, setBusy] = useState(null) // 'profile' | 'password'

  const identityChanged = lower(profile.username) !== lower(user.username) || lower(profile.email) !== lower(user.email)
  const profileChanged = identityChanged || profile.name.trim() !== user.name
  const profileReady = profileChanged && profile.name.trim() && profile.username.trim() && profile.email.trim() && (!identityChanged || profilePassword)
  const pwReady = pw.current_password && passwordAccepted(pw.password) && pw.password === pw.password_confirmation

  async function send(kind, body, onDone) {
    const setErrors = kind === 'profile' ? setProfileErrors : setPwErrors
    setBusy(kind)
    setErrors({})
    try {
      const updated = await authApi.updateMe(body)
      setUser(updated)
      onDone(updated)
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
      else toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const saveProfile = () =>
    send('profile', { name: profile.name.trim(), username: profile.username.trim(), email: profile.email.trim(), current_password: profilePassword }, (u) => {
      setProfile({ name: u.name, username: u.username, email: u.email })
      setProfilePassword('')
      toast.success('Account updated.')
    })

  const savePassword = () =>
    send('password', { name: user.name, username: user.username, email: user.email, ...pw }, () => {
      setPw({ current_password: '', password: '', password_confirmation: '' })
      toast.success('Password changed. Use it next time you sign in.')
    })

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-ink text-[20px] font-semibold text-on-ink">{initialsOf(profile.name || user.name)}</span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight">{user.name}</h2>
          <p className="text-[13px] text-muted">@{user.username} · {user.email}</p>
          <p className="mt-1.5 flex flex-wrap gap-2 text-[12px]">
            <span className={`rounded-full px-2 py-0.5 ${user.role === 'admin' ? 'bg-ink text-on-ink' : 'bg-hover text-muted'}`}>{user.role === 'admin' ? 'Admin' : 'User'}</span>
            <span className="text-subtle">Member since {when(user.created_at)}</span>
          </p>
        </div>
      </div>

      <Block
        title="Profile"
        description="Your name and how you sign in. You can use your username or email on the sign-in page."
        footer={<SaveButton busy={busy === 'profile'} disabled={!profileReady} onClick={saveProfile}>Save profile</SaveButton>}
      >
        <Field label="Full name"><Text value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} autoComplete="name" />{fieldError(profileErrors, 'name')}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username">
            <Text value={profile.username} onChange={(v) => setProfile({ ...profile, username: v.replace(/\s/g, '') })} autoComplete="username" />{fieldError(profileErrors, 'username')}
          </Field>
          <Field label="Email"><Text type="email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} autoComplete="email" />{fieldError(profileErrors, 'email')}</Field>
        </div>
        {identityChanged && (
          <div className="drop-in rounded-md bg-hover/60 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-medium"><FiLock className="text-[12px]" /> Confirm it’s you</p>
            <p className="mt-0.5 mb-3 text-[12px] text-muted">Changing your username or email needs your current password.</p>
            <Field group label="Current password">
              <PasswordInput value={profilePassword} onChange={setProfilePassword} autoComplete="current-password" />{fieldError(profileErrors, 'current_password')}
            </Field>
          </div>
        )}
      </Block>

      <Block
        title="Password"
        description="Use a password you don’t use anywhere else. The checklist shows what makes it stronger."
        footer={<SaveButton busy={busy === 'password'} disabled={!pwReady} onClick={savePassword}>Change password</SaveButton>}
      >
        <Field group label="Current password">
          <PasswordInput value={pw.current_password} onChange={(v) => setPw({ ...pw, current_password: v })} autoComplete="current-password" />
          {fieldError(pwErrors, 'current_password')}
        </Field>
        <Field group label="New password">
          <PasswordInput value={pw.password} onChange={(v) => setPw({ ...pw, password: v })} autoComplete="new-password" />
          {fieldError(pwErrors, 'password')}
          <PasswordStrength password={pw.password} confirm={pw.password_confirmation} />
        </Field>
        <Field group label="Repeat new password">
          <PasswordInput value={pw.password_confirmation} onChange={(v) => setPw({ ...pw, password_confirmation: v })} autoComplete="new-password" />
        </Field>
      </Block>
    </div>
  )
}
