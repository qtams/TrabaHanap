import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { FiBell, FiMenu, FiSearch, FiSidebar } from 'react-icons/fi'
import api from '../api/client.js'
import { NAV_ITEMS } from '../layouts/navigation.js'
import ThemeToggle from './ThemeToggle.jsx'

const ICON_BTN = 'grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink'

export default function Header({ onMenuClick, onCollapseClick }) {
  const { pathname } = useLocation()
  const title = NAV_ITEMS.find((item) => item.path === pathname)?.label ?? ''
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
        <div className="ml-1 grid size-7 place-items-center rounded-full bg-hover text-[11px] font-medium text-muted">TH</div>
      </div>
    </motion.header>
  )
}
