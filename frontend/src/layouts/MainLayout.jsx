import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'

const COLLAPSED_KEY = 'sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false) // mobile drawer
  const [collapsed, setCollapsed] = useState(readCollapsed) // desktop icon-only sidebar
  const { pathname } = useLocation()

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      } catch {
        // storage blocked: the choice just lasts for this visit
      }
      return !c
    })
  }

  return (
    // --sidebar-w lets fixed bars on pages (e.g. the profile save bar) sit beside the sidebar.
    <div className="min-h-screen" style={{ '--sidebar-w': collapsed ? '3.5rem' : '14rem' }}>
      <Sidebar open={menuOpen} collapsed={collapsed} onClose={() => setMenuOpen(false)} />
      <div className={`transition-[padding] duration-200 ease-out ${collapsed ? 'lg:pl-14' : 'lg:pl-56'}`}>
        <Header onMenuClick={() => setMenuOpen(true)} onCollapseClick={toggleCollapsed} />
        {/* key = path, so the drop-in replays on every page change */}
        <main key={pathname} className="drop-in mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
