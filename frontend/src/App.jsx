import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import { NAV_ITEMS } from './layouts/navigation.js'
import ComingSoon from './pages/ComingSoon.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NotFound from './pages/NotFound.jsx'
import JobFinderPage from './pages/jobs/JobFinderPage.jsx'
import ProfilePage from './pages/profile/ProfilePage.jsx'
import ResumePage from './pages/resume/ResumePage.jsx'

// Built pages go here, keyed by path; every other menu item shows <ComingSoon />.
const PAGES = { '/': <Dashboard />, '/resume': <ResumePage />, '/profile': <ProfilePage />, '/job-finder': <JobFinderPage /> }

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <Route key={path} path={path} element={PAGES[path] ?? <ComingSoon title={label} icon={icon} />} />
        ))}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
