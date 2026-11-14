import { useState } from 'react'
import { FiBookmark } from 'react-icons/fi'
import { LEVELS, SETUPS, SOURCE_NAMES, TYPES, timeAgo } from '../labels.js'

// Company logo, or its initials when there is none (or it fails to load).
export function CompanyLogo({ job, size = 'size-10' }) {
  const [failed, setFailed] = useState(false)
  const initials = job.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return job.company_logo && !failed ? (
    <img src={job.company_logo} alt="" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-md border border-line bg-white object-contain`} />
  ) : (
    <span aria-hidden="true" className={`${size} grid shrink-0 place-items-center rounded-md bg-hover text-[12px] font-medium text-muted`}>{initials}</span>
  )
}

// Credit + link to the listing on the source site (required by Himalayas and Remotive).
export function SourceCredit({ job }) {
  return (
    <a href={job.source_url ?? job.url} target="_blank" rel="noreferrer" className="relative z-10 underline-offset-2 hover:text-ink hover:underline">
      via {SOURCE_NAMES[job.source] ?? job.source}
    </a>
  )
}

export function SaveButton({ job, onToggle, className = '' }) {
  const saved = Boolean(job.saved_at)
  return (
    <button
      type="button"
      onClick={() => onToggle(job)}
      aria-pressed={saved}
      aria-label={saved ? 'Unsave job' : 'Save job'}
      title={saved ? 'Saved' : 'Save job'}
      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-md hover:bg-hover ${saved ? 'text-ink' : 'text-muted'} ${className}`}
    >
      <FiBookmark className="text-[15px]" fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}

// C. one listing. The title button covers the card, so a click anywhere opens the details.
export default function JobCard({ job, selected, onOpen, onToggleSave }) {
  const meta = [job.salary_text, TYPES[job.employment_type], SETUPS[job.work_setup], LEVELS[job.experience_level]].filter(Boolean)

  return (
    <article className={`relative rounded-lg border p-4 transition-colors hover:border-subtle ${selected ? 'border-ink' : 'border-line'}`}>
      <div className="flex gap-3">
        <CompanyLogo job={job} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-medium">
            <button type="button" onClick={() => onOpen(job)} className="text-left after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none">
              {job.title}
            </button>
          </h3>
          <p className="truncate text-[13px] text-muted">{[job.company, job.location].filter(Boolean).join(' · ')}</p>
        </div>
        <SaveButton job={job} onToggle={onToggleSave} />
      </div>

      {meta.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {meta.map((m) => <li key={m} className="rounded-md border border-line px-2 py-0.5 text-[12px]">{m}</li>)}
        </ul>
      )}
      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{job.description}</p>
      <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
        <SourceCredit job={job} />
        {job.posted_at && <><span aria-hidden="true">·</span><span>{timeAgo(job.posted_at)}</span></>}
      </p>
    </article>
  )
}
