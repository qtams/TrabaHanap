import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FiLoader } from 'react-icons/fi'
import { useAuth } from './auth/context.js'
import MainLayout from './layouts/MainLayout.jsx'
import { NAV_ITEMS } from './layouts/navigation.js'
import ComingSoon from './pages/ComingSoon.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NotFound from './pages/NotFound.jsx'
import AccountPage from './pages/account/AccountPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import JobFinderPage from './pages/jobs/JobFinderPage.jsx'
import ProfilePage from './pages/profile/ProfilePage.jsx'
import ResumePage from './pages/resume/ResumePage.jsx'
import UsersPage from './pages/users/UsersPage.jsx'

// Built pages go here, keyed by path; every other menu item shows <ComingSoon />.
const PAGES = { '/': <Dashboard />, '/resume': <ResumePage />, '/profile': <ProfilePage />, '/job-finder': <JobFinderPage />, '/users': <UsersPage /> }

// Signed-in users only; the login page sends them back where they were going.
function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user === undefined) {
    return <div className="grid min-h-screen place-items-center text-muted"><FiLoader className="animate-spin" /></div>
  }
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        {NAV_ITEMS.filter((item) => !item.admin || user?.role === 'admin').map(({ path, label, icon }) => (
          <Route key={path} path={path} element={PAGES[path] ?? <ComingSoon title={label} icon={icon} />} />
        ))}
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
