import { Link } from 'react-router-dom'
import { FiArrowUpRight } from 'react-icons/fi'

// Real numbers come in once the features exist; until then everything shows its empty state.
const STATS = [
  { label: 'Matched jobs', to: '/matched-jobs' },
  { label: 'Applications', to: '/applications' },
  { label: 'Interviews', to: '/interviews' },
  { label: 'Recruiter replies', to: '/gmail-assistant' },
]

const STEPS = [
  { label: 'Upload your resume', hint: 'PDF or DOCX', to: '/resume' },
  { label: 'Fill in your professional profile', hint: 'Skills, salary, locations', to: '/profile' },
  { label: 'Set your AI preferences', hint: 'How strict matching should be', to: '/ai-settings' },
  { label: 'Connect Gmail and Calendar', hint: 'Track replies, book interviews', to: '/integrations' },
]

export default function Dashboard() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-1 text-[13px] text-muted">Here&apos;s where your job search stands.</p>
      </div>

      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-line lg:grid-cols-4">
        {STATS.map(({ label, to }, i) => (
          <Link
            key={label}
            to={to}
            className={`group p-5 transition-colors hover:bg-hover/60 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
          >
            <div className="flex items-center justify-between text-[13px] text-muted">
              {label}
              <FiArrowUpRight className="opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">0</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[14px] font-medium">Get started</h3>
            <span className="text-[12px] text-subtle">0 of {STEPS.length}</span>
          </div>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {STEPS.map(({ label, hint, to }) => (
              <li key={label}>
                <Link to={to} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover/60">
                  <span className="size-4 shrink-0 rounded-full border border-subtle" />
                  <span className="flex-1 text-[13px]">{label}</span>
                  <span className="hidden text-[12px] text-subtle sm:block">{hint}</span>
                  <FiArrowUpRight className="text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h3 className="text-[14px] font-medium">Upcoming interviews</h3>
          <div className="mt-3 rounded-lg border border-dashed border-line px-4 py-10 text-center">
            <p className="text-[13px] text-muted">No interviews scheduled.</p>
            <Link to="/interviews" className="mt-1 inline-block text-[13px] font-medium underline-offset-4 hover:underline">
              Open scheduler
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
