import { NavLink } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { useAuth } from '../auth/context.js'
import { NAV_GROUPS } from '../layouts/navigation.js'

// Desktop: fixed, and `collapsed` shrinks it to icons only (hover an icon for its name).
// Mobile: slide-in drawer, always full width (open/onClose come from MainLayout).
export default function Sidebar({ open, collapsed, onClose }) {
  const hideWhenCollapsed = collapsed ? 'lg:hidden' : ''
  const isAdmin = useAuth()?.user?.role === 'admin'
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.admin || isAdmin) })).filter((g) => g.items.length)

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col overflow-hidden border-r border-line bg-surface transition-[width,translate] duration-200 ease-out lg:translate-x-0 ${collapsed ? 'lg:w-14' : ''} ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex h-14 shrink-0 items-center justify-between px-4 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <NavLink to="/" onClick={onClose} className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-semibold text-on-ink">T</span>
            <span className={`whitespace-nowrap ${hideWhenCollapsed}`}>TrabaHanap</span>
          </NavLink>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-hover lg:hidden" aria-label="Close menu">
            <FiX className="text-base" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => (
            <div key={group.label} className="mt-3 first:mt-1">
              {group.label && (
                <>
                  <p className={`px-2 pb-1 text-[11px] font-medium whitespace-nowrap text-subtle ${hideWhenCollapsed}`}>{group.label}</p>
                  {collapsed && <div className="mx-2 mb-2 hidden h-px bg-line lg:block" />}
                </>
              )}
              <ul>
                {group.items.map(({ label, path, icon: Icon }) => (
                  <li key={path}>
                    <NavLink
                      to={path}
                      end
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-md px-2 py-[5px] text-[13px] transition-colors ${
                          collapsed ? 'lg:justify-center lg:px-0 lg:py-[7px]' : ''
                        } ${isActive ? 'bg-hover font-medium text-ink' : 'text-muted hover:bg-hover hover:text-ink'}`
                      }
                    >
                      <Icon className="shrink-0 text-[14px]" />
                      <span className={`truncate ${hideWhenCollapsed}`}>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
