import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="drop-in grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-[13px] text-subtle">404</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Page not found</h1>
        <Link to="/" className="mt-5 inline-block rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-on-ink hover:opacity-85">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
