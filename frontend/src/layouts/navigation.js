import {
  FiBarChart2, FiCalendar, FiClock, FiFileText, FiGrid, FiLink,
  FiMail, FiSearch, FiSend, FiSliders, FiTarget, FiUser, FiUsers,
} from 'react-icons/fi'

// Single source for the sidebar (items with admin: true only show to admins), the header title and the route table (App.jsx).
export const NAV_GROUPS = [
  { label: '', items: [{ label: 'Dashboard', path: '/', icon: FiGrid }] }, // no heading: sits on top
  {
    label: 'Profile',
    items: [
      { label: 'My Resume', path: '/resume', icon: FiFileText },
      { label: 'My Professional Profile', path: '/profile', icon: FiUser },
    ],
  },
  {
    label: 'Jobs',
    items: [
      { label: 'AI Job Finder', path: '/job-finder', icon: FiSearch },
      { label: 'Matched Jobs', path: '/matched-jobs', icon: FiTarget },
      { label: 'Applications', path: '/applications', icon: FiSend },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Gmail Assistant', path: '/gmail-assistant', icon: FiMail },
      { label: 'Interview Scheduler', path: '/interviews', icon: FiClock },
      { label: 'Calendar', path: '/calendar', icon: FiCalendar },
    ],
  },
  { label: 'Insights', items: [{ label: 'Analytics', path: '/analytics', icon: FiBarChart2 }] },
  {
    label: 'Settings',
    items: [
      { label: 'AI Settings', path: '/ai-settings', icon: FiSliders },
      { label: 'Integrations', path: '/integrations', icon: FiLink },
      { label: 'Users', path: '/users', icon: FiUsers, admin: true }, // admins only
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
