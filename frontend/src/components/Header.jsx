import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { FiBell, FiLogOut, FiMenu, FiSearch, FiSidebar, FiUser, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import api from '../api/client.js'
import { useAuth } from '../auth/context.js'
import { NAV_ITEMS } from '../layouts/navigation.js'
import ThemeToggle from './ThemeToggle.jsx'

const ICON_BTN = 'grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink'

export default function Header({ onMenuClick, onCollapseClick }) {
  const { pathname } = useLocation()
  const title = NAV_ITEMS.find((item) => item.path === pathname)?.label ?? { '/account': 'My account' }[pathname] ?? ''
  const [apiUp, setApiUp] = useState(null)

  useEffect(() => {
    api.get('/health').then(() => setApiUp(true), () => setApiUp(false))
  }, [])

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/85 px-4 backdrop-blur lg:px-6"
    >
      <button onClick={onMenuClick} className={`${ICON_BTN} -ml-1.5 lg:hidden`} aria-label="Open menu">
        <FiMenu className="text-base" />
      </button>
      <button onClick={onCollapseClick} className={`${ICON_BTN} -ml-1.5 hidden lg:grid`} aria-label="Toggle sidebar" title="Toggle sidebar">
        <FiSidebar className="text-[15px]" />
      </button>
      <span className="hidden h-4 w-px bg-line lg:block" />
      <h1 className="truncate text-[14px] font-medium">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        <label className="mr-1 hidden h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[13px] focus-within:border-subtle md:flex">
          <FiSearch className="text-subtle" />
          <input placeholder="Search" className="w-44 bg-transparent outline-none placeholder:text-subtle" />
        </label>
        {apiUp !== null && (
          <span
            title={apiUp ? 'API online' : 'API offline. Is php artisan serve running?'}
            className={`mx-1.5 size-1.5 rounded-full ${apiUp ? 'bg-online' : 'bg-red-500'}`}
          />
        )}
        <ThemeToggle />
        <button className={ICON_BTN} aria-label="Notifications">
          <FiBell className="text-[15px]" />
        </button>
        <UserMenu />
      </div>
    </motion.header>
  )
}

// Avatar with the signed-in user's initials; opens name, role and Sign out.
function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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

  if (!user) return null
  const initials = user.name.split(/s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className="grid size-7 place-items-center rounded-full bg-hover text-[11px] font-medium text-muted hover:text-ink"
      >
        {initials}
      </button>
      {open && (
        <div role="menu" className="drop-in absolute right-0 mt-2 w-56 rounded-lg border border-line bg-surface p-1 shadow-lg">
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-[12px] text-muted">@{user.username} · {user.role === 'admin' ? 'Admin' : 'User'}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link to="/account" role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-muted hover:bg-hover hover:text-ink">
            <FiUser className="text-[13px]" /> My account
          </Link>
          {user.role === 'admin' && (
            <Link to="/users" role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-muted hover:bg-hover hover:text-ink">
              <FiUsers className="text-[13px]" /> Manage users
            </Link>
          )}
          <div className="my-1 h-px bg-line" />
          <button type="button" role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-muted hover:bg-hover hover:text-ink">
            <FiLogOut className="text-[13px]" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
