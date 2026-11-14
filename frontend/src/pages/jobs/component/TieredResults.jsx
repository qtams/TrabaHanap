import { useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import JobCard from './JobCard.jsx'

const PER_PAGE = 20
const TIERS = {
  match: ['Matching your search', 'Your job titles (or what you typed), places, keywords and filters.'],
  related: ['Related to you', 'Similar roles that mention your skills, from your search or your profile.'],
  fits: ['Fits your filters', 'Other jobs that fit the filters you set.'],
  other: ['More jobs from our sources', 'Everything else, for more choices. Ones that mention your skills come first.'],
}
const FEW = 10 // with filters on, fewer than this gets a "remove a filter" hint

// Page numbers to show: first, last, and two either side of the current one, with gaps as "…".
function pageList(current, total) {
  const pages = [...new Set([1, total, current - 2, current - 1, current, current + 1, current + 2])]
    .filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ['…', p] : [p]))
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null
  const btn = 'grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13px] tabular-nums'
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1 pt-2">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page" className={`${btn} text-muted hover:bg-hover hover:text-ink disabled:opacity-30`}>
        <FiChevronLeft />
      </button>
      {pageList(page, pages).map((p, i) => (p === '…'
        ? <span key={`gap-${i}`} className="px-1 text-[13px] text-subtle">…</span>
        : (
          <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={`${btn} ${p === page ? 'bg-ink font-medium text-on-ink' : 'text-muted hover:bg-hover hover:text-ink'}`}>
            {p}
          </button>
        )))}
      <button type="button" onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="Next page" className={`${btn} text-muted hover:bg-hover hover:text-ink disabled:opacity-30`}>
        <FiChevronRight />
      </button>
    </nav>
  )
}

/**
 * Every job from the search in one list, most relevant first (match → related → other), 20 a page.
 * Each tier starts with a heading. Remount (key) on a new search to go back to page 1.
 */
export default function TieredResults({ jobs, counts, filtered, setups = [], skills, openId, onOpen, onToggleSave }) {
  // Our sources are remote job boards: an Onsite / Hybrid-only filter leaves little.
  const remoteHint = setups.length > 0 && !setups.includes('remote')
    ? ' Our sources mostly list remote jobs, so add Remote or remove Onsite / Hybrid. For onsite work, try JobStreet or Indeed above.'
    : ''
  const [page, setPage] = useState(1)
  const top = useRef(null)
  const pages = Math.max(1, Math.ceil(jobs.length / PER_PAGE))
  const shown = jobs.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const go = (p) => {
    setPage(p)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Split this page into runs of the same tier, so each run gets its heading.
  const runs = []
  for (const job of shown) {
    const tier = job.tier ?? 'match'
    if (runs.at(-1)?.tier === tier) runs.at(-1).jobs.push(job)
    else runs.push({ tier, jobs: [job], continued: runs.length === 0 && page > 1 && jobs[(page - 1) * PER_PAGE - 1]?.tier === tier })
  }

  if (!jobs.length) {
    return (
      <p className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-[13px] text-muted">
        {filtered ? `No jobs fit your filters right now. Remove a filter to see more.${remoteHint}` : 'No jobs from our sources right now. Try again later or pick more platforms.'}
      </p>
    )
  }

  return (
    <div ref={top} className="scroll-mt-20 space-y-5">
      {counts && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          {[['match', 'matching'], ['related', 'related'], ['fits', 'fit your filters'], ['other', 'more']]
            .filter(([k]) => counts[k] > 0)
            .map(([k, label]) => <span key={k}><span className="font-medium text-ink tabular-nums">{counts[k]}</span> {label}</span>)}
          <span className="ml-auto">Page {page} of {pages}</span>
        </p>
      )}

      {filtered && (
        <p className="drop-in rounded-lg bg-hover/60 px-3.5 py-2.5 text-[12px] text-muted">
          {jobs.length < FEW
            ? <>Only <span className="font-medium text-ink">{jobs.length}</span> {jobs.length === 1 ? 'job fits' : 'jobs fit'} your filters. Remove a filter to see more, including every other job from our sources.{remoteHint}</>
            : <>Filters are on, so only jobs that fit them are shown. Remove the filters to see every job from our sources too.</>}
        </p>
      )}

      {runs.map((run) => (
        <section key={`${page}-${run.tier}`} className="drop-in space-y-3">
          <div>
            <h4 className="text-[13px] font-semibold">
              {TIERS[run.tier][0]}{run.continued && <span className="font-normal text-muted"> (continued)</span>}
              <span className="ml-1.5 font-normal text-muted tabular-nums">{counts?.[run.tier]}</span>
            </h4>
            {!run.continued && <p className="mt-0.5 text-[12px] text-muted">{TIERS[run.tier][1]}</p>}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {run.jobs.map((job) => <JobCard key={job.id} job={job} selected={job.id === openId} onOpen={onOpen} onToggleSave={onToggleSave} skills={skills} />)}
          </div>
        </section>
      ))}

      <Pagination page={page} pages={pages} onPage={go} />
    </div>
  )
}
