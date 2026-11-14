import { Link } from 'react-router-dom'

// Placeholder for menu pages not built yet. Replace per page as features land.
export default function ComingSoon({ title, icon: Icon }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line px-6 py-24 text-center">
      {Icon && <Icon className="text-xl text-subtle" />}
      <h2 className="mt-3 text-[15px] font-medium">{title}</h2>
      <p className="mt-1 text-[13px] text-muted">This page isn&apos;t built yet.</p>
      <Link to="/" className="mt-4 text-[13px] font-medium underline-offset-4 hover:underline">
        Back to Dashboard
      </Link>
    </div>
  )
}
