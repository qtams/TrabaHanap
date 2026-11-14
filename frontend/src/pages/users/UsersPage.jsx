import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiEye, FiEyeOff, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import { errorMessage } from '../../api/resumes.js'
import * as usersApi from '../../api/users.js'
import { useAuth } from '../../auth/context.js'
import { Field, Select, Text } from '../../components/fields.jsx'
import PasswordStrength from '../../components/PasswordStrength.jsx'
import SidePanel from '../../components/SidePanel.jsx'
import { confirm } from '../../lib/alerts.js'
import { passwordAccepted } from '../../lib/password.js'
import { toast } from '../../lib/toast.js'

const ROLES = { user: 'User', admin: 'Admin' }
const STATUSES = { active: 'Active', inactive: 'Inactive' }
const BLANK = { name: '', username: '', email: '', password: '', role: 'user', status: 'active' }

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never')

function Badge({ tone, children }) {
  const tones = {
    admin: 'bg-ink text-on-ink',
    user: 'bg-hover text-muted',
    active: 'text-green-700 dark:text-green-400',
    inactive: 'text-subtle',
  }
  const dot = tone === 'active' || tone === 'inactive'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full text-[12px] ${dot ? '' : 'px-2 py-0.5'} ${tones[tone]}`}>
      {dot && <span className={`size-1.5 rounded-full ${tone === 'active' ? 'bg-online' : 'bg-subtle'}`} />}
      {children}
    </span>
  )
}

// Active / Inactive switch. Your own account can't be switched off.
function StatusSwitch({ user, disabled, onToggle }) {
  const on = user.status === 'active'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${user.name}: ${on ? 'active' : 'inactive'}`}
      title={disabled ? 'You can’t deactivate yourself' : on ? 'Click to deactivate' : 'Click to activate'}
      onClick={onToggle}
      disabled={disabled}
      className="group inline-flex items-center gap-2 disabled:cursor-not-allowed"
    >
      <span className={`relative h-[18px] w-8 rounded-full transition-colors ${on ? 'bg-online' : 'bg-line'} group-disabled:opacity-50`}>
        <span className={`absolute top-[2px] left-[2px] size-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-[14px]' : ''}`} />
      </span>
      <span className={`text-[12px] ${on ? 'text-ink' : 'text-subtle'}`}>{STATUSES[user.status]}</span>
    </button>
  )
}

// Add / edit form in the side panel. Password: required for new users, blank keeps it on edit.
function UserForm({ draft, setDraft, isNew, isSelf, errors }) {
  const [show, setShow] = useState(false)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const err = (k) => errors?.[k]?.[0] && <p className="mt-1 text-[12px] text-red-600 dark:text-red-400">{errors[k][0]}</p>

  return (
    <div className="space-y-4">
      <Field label="Full name"><Text value={draft.name} onChange={(v) => set({ name: v })} autoFocus />{err('name')}</Field>
      <Field label="Username" hint="letters, numbers, - and _">
        <Text value={draft.username} onChange={(v) => set({ username: v.replace(/\s/g, '') })} autoComplete="off" />{err('username')}
      </Field>
      <Field label="Email"><Text type="email" value={draft.email} onChange={(v) => set({ email: v })} autoComplete="off" />{err('email')}</Field>
      <Field group label="Password" hint={isNew ? 'at least 8 characters, letters and numbers' : 'leave blank to keep the current one'}>
        <span className="relative block">
          <Text type={show ? 'text' : 'password'} value={draft.password} onChange={(v) => set({ password: v })} autoComplete="new-password" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded text-subtle hover:text-ink">
            {show ? <FiEyeOff /> : <FiEye />}
          </button>
        </span>
        {err('password')}
        <PasswordStrength password={draft.password} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role"><Select value={draft.role} onChange={(v) => set({ role: v })} options={ROLES} placeholder="—" /></Field>
        <Field label="Status"><Select value={draft.status} onChange={(v) => set({ status: v })} options={STATUSES} placeholder="—" /></Field>
      </div>
      {isSelf && <p className="text-[12px] text-muted">This is you. You can’t remove your own admin role or deactivate yourself.</p>}
      <p className="rounded-md bg-hover/60 px-3 py-2.5 text-[12px] leading-relaxed text-muted">
        <span className="font-medium text-ink">Admin</span> can manage users. <span className="font-medium text-ink">Inactive</span> accounts can’t sign in.
      </p>
    </div>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // all | admin | inactive
  const [editing, setEditing] = useState(null) // { id | null, draft, errors }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    usersApi.listUsers().then(setUsers, (err) => toast.error(errorMessage(err)))
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users ?? [])
      .filter((u) => filter === 'all' || (filter === 'admin' ? u.role === 'admin' : u.status === 'inactive'))
      .filter((u) => !q || [u.name, u.username, u.email].some((v) => v?.toLowerCase().includes(q)))
  }, [users, query, filter])

  const draft = editing?.draft
  const valid = draft && draft.name.trim() && draft.username.trim() && draft.email.trim()
    && (draft.password ? passwordAccepted(draft.password) : !!editing.id) // new users need one; on edit blank keeps it

  async function save() {
    setSaving(true)
    try {
      const saved = editing.id ? await usersApi.updateUser(editing.id, draft) : await usersApi.createUser(draft)
      setUsers((list) => (editing.id ? list.map((u) => (u.id === saved.id ? saved : u)) : [...list, saved].sort((a, b) => a.name.localeCompare(b.name))))
      toast.success(editing.id ? 'User updated.' : `${saved.name} can now sign in.`)
      setEditing(null)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) setEditing((e) => ({ ...e, errors }))
      else toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Flip Active / Inactive straight from the table (inactive accounts can't sign in).
  async function toggleStatus(u) {
    const status = u.status === 'active' ? 'inactive' : 'active'
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status } : x))) // show it at once
    try {
      const saved = await usersApi.updateUser(u.id, { ...u, password: '', status })
      setUsers((list) => list.map((x) => (x.id === saved.id ? saved : x)))
      toast.success(status === 'active' ? `${u.name} can sign in again.` : `${u.name} can no longer sign in.`)
    } catch (err) {
      setUsers((list) => list.map((x) => (x.id === u.id ? u : x))) // undo
      toast.error(errorMessage(err))
    }
  }

  async function remove(u) {
    if (!(await confirm({ title: `Delete ${u.name}?`, text: 'They will no longer be able to sign in. This can’t be undone.', confirmText: 'Delete', tone: 'danger' }))) return
    try {
      await usersApi.deleteUser(u.id)
      setUsers((list) => list.filter((x) => x.id !== u.id))
      toast.success('User deleted.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const counts = { all: users?.length ?? 0, admin: users?.filter((u) => u.role === 'admin').length ?? 0, inactive: users?.filter((u) => u.status === 'inactive').length ?? 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Users</h2>
          <p className="mt-1 text-[13px] text-muted">Who can sign in to TrabaHanap, and who can manage it. Only admins see this page.</p>
        </div>
        <button type="button" onClick={() => setEditing({ id: null, draft: { ...BLANK } })} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-on-ink hover:opacity-85">
          <FiPlus /> Add user
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line px-3 text-[13px] focus-within:border-subtle sm:max-w-xs">
          <FiSearch className="text-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, username or email" className="w-full bg-transparent outline-none placeholder:text-subtle" />
        </label>
        <div className="flex gap-1 text-[13px]">
          {[['all', 'All'], ['admin', 'Admins'], ['inactive', 'Inactive']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-md px-2.5 py-1.5 ${filter === key ? 'bg-hover font-medium text-ink' : 'text-muted hover:text-ink'}`}>
              {label} <span className="text-subtle tabular-nums">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {users === null ? (
        <p className="text-[13px] text-muted">Loading…</p>
      ) : (
        <div className="drop-in overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Last sign-in</th>
                <th className="w-20 px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((u) => (
                <tr key={u.id} className="group hover:bg-hover/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-hover text-[11px] font-medium text-muted">{initials(u.name)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name}{u.id === me?.id && <span className="ml-1.5 text-[11px] font-normal text-subtle">(you)</span>}</p>
                        <p className="truncate text-[12px] text-muted">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone={u.role}>{ROLES[u.role]}</Badge></td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusSwitch user={u} disabled={u.id === me?.id} onToggle={() => toggleStatus(u)} />
                  </td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{when(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100">
                      <button type="button" onClick={() => setEditing({ id: u.id, draft: { ...BLANK, ...u, password: '' } })} aria-label={`Edit ${u.name}`} className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink">
                        <FiEdit2 className="text-[13px]" />
                      </button>
                      {u.id !== me?.id && (
                        <button type="button" onClick={() => remove(u)} aria-label={`Delete ${u.name}`} className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-red-600">
                          <FiTrash2 className="text-[13px]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-muted">No users match.</p>}
        </div>
      )}

      {editing && (
        <SidePanel
          title={editing.id ? 'Edit user' : 'Add user'}
          description={editing.id ? `@${draft.username}` : 'They sign in with their username or email and this password.'}
          onClose={() => setEditing(null)}
          onCancel={() => setEditing(null)}
          primaryLabel={saving ? 'Saving…' : editing.id ? 'Save' : 'Add user'}
          onPrimary={save}
          primaryDisabled={!valid || saving}
        >
          <UserForm
            draft={draft}
            setDraft={(fn) => setEditing((e) => ({ ...e, draft: typeof fn === 'function' ? fn(e.draft) : fn }))}
            isNew={!editing.id}
            isSelf={editing.id === me?.id}
            errors={editing.errors}
          />
        </SidePanel>
      )}
    </div>
  )
}
