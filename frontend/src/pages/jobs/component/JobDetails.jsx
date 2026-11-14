import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiCheck, FiExternalLink, FiFileText, FiLoader, FiMinus, FiRefreshCw, FiX, FiZap } from 'react-icons/fi'
import { LEVELS, SETUPS, SOURCE_NAMES, TYPES, formatDate, timeAgo } from '../labels.js'
import { CompanyLogo, SaveButton, SourceCredit } from './JobCard.jsx'

const BUSY_TEXT = {
  analyze: 'Reading the posting…',
  compatibility: 'Checking the job against your profile…',
  compare: 'Comparing the job with your resume…',
  prepare: 'Tailoring your resume…',
}
const FIT = {
  fits: ['Fits', 'text-green-700 dark:text-green-400'],
  partly: ['Partly', 'text-amber-700 dark:text-amber-400'],
  does_not_fit: ['Doesn’t fit', 'text-red-700 dark:text-red-400'],
  unknown: ['Unknown', 'text-muted'],
}
const STATUS = {
  met: [FiCheck, 'text-green-700 dark:text-green-400', 'Met'],
  partial: [FiMinus, 'text-amber-700 dark:text-amber-400', 'Partly met'],
  missing: [FiX, 'text-red-700 dark:text-red-400', 'Missing'],
}
const PREFERENCE = { location: 'Location', work_setup: 'Work setup', salary: 'Salary', employment_type: 'Employment type' }
const CHIP = 'rounded-md border border-line px-2 py-0.5 text-[12px]'

function Block({ title, children, show = true }) {
  if (!show) return null
  return (
    <section>
      <h3 className="text-[13px] font-medium">{title}</h3>
      <div className="mt-1.5 text-[13px] leading-relaxed">{children}</div>
    </section>
  )
}

function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-subtle">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  )
}

// The AI step for a tab: what it does and one button. Shows progress while it runs.
function AiPrompt({ title, text, action, onClick, busyText, disabled, note }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-hover text-muted"><FiZap /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">{title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{text}</p>
          {busyText ? (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-muted"><FiLoader className="animate-spin" /> {busyText} This can take up to a minute.</p>
          ) : (
            <button type="button" onClick={onClick} disabled={disabled} className="mt-3 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-40">{action}</button>
          )}
          {note && <p className="mt-2 text-[12px] text-muted">{note}</p>}
        </div>
      </div>
    </div>
  )
}

// Title row over an AI result, with a quiet "run again".
function ResultHead({ title, onRedo, busy }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-subtle uppercase"><FiZap /> {title}</p>
      <button type="button" onClick={onRedo} disabled={busy} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink disabled:opacity-40">
        {busy ? <FiLoader className="animate-spin" /> : <FiRefreshCw />} {busy ? 'Working…' : 'Run again'}
      </button>
    </div>
  )
}

/**
 * D. job details + E. AI assistance, in a panel over the whole screen (portal, so page animations
 * can't trap it). Actions are run by the page (onAction) so results update the lists too.
 */
export default function JobDetails({ job, resumes, busy, onClose, onToggleSave, onAction }) {
  const [tab, setTab] = useState('overview')
  const usable = resumes.filter((r) => !r.tailored_from_id && r.data)
  const [resumeId, setResumeId] = useState(job.compared_resume_id ?? usable[0]?.id ?? '')

  // Escape closes; the page behind doesn't scroll while the panel is open.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const run = (action) => onAction(action, job, resumeId)
  const busyFor = (action) => (busy === action ? BUSY_TEXT[action] : null)

  const a = job.analysis
  const deadline = formatDate(job.deadline) ?? a?.application_deadline
  const meta = [job.salary_text, TYPES[job.employment_type], SETUPS[job.work_setup], LEVELS[job.experience_level]].filter(Boolean)
  const tabs = [
    ['overview', 'Overview', null],
    ['fit', 'Compatibility', job.compatibility && job.compatibility.score],
    ['resume', 'Resume match', job.resume_comparison && `${job.resume_comparison.coverage}%`],
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={job.title}>
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in absolute inset-0 bg-black/25 dark:bg-black/50" />

      <aside className="slide-in relative flex h-full w-full max-w-[640px] flex-col border-l border-line bg-surface shadow-2xl">
        {/* Top bar stays put; everything below scrolls as one. */}
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <p className="truncate text-[12px] text-muted">
            <SourceCredit job={job} />
            {job.posted_at && ` · posted ${timeAgo(job.posted_at)}`}
          </p>
          <div className="flex items-center gap-1">
            <SaveButton job={job} onToggle={onToggleSave} />
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink">
              <FiX />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <header className="space-y-4 px-6 pt-6 pb-5">
            <div className="flex gap-3.5">
              <CompanyLogo job={job} size="size-12" />
              <div className="min-w-0">
                <h2 className="text-[17px] leading-snug font-semibold tracking-tight">{job.title}</h2>
                <p className="mt-0.5 text-[13px] text-muted">{[job.company, job.location].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            {(meta.length > 0 || deadline) && (
              <ul className="flex flex-wrap gap-1.5">
                {meta.map((m) => <li key={m} className={CHIP}>{m}</li>)}
                {deadline && <li className={`${CHIP} text-muted`}>Apply by {deadline}</li>}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-on-ink hover:opacity-85">
                Apply <FiExternalLink className="text-[12px]" />
              </a>
              <button
                type="button"
                onClick={() => run('prepare')}
                disabled={!!busy || !resumeId}
                title={resumeId ? 'Make a copy of your resume tailored to this job' : 'Upload a resume first'}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-[13px] hover:bg-hover disabled:opacity-40"
              >
                {busy === 'prepare' ? <FiLoader className="animate-spin" /> : <FiFileText />}
                {busy === 'prepare' ? BUSY_TEXT.prepare : 'Tailor my resume'}
              </button>
            </div>

            {usable.length > 0 ? (
              <label className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                Using resume
                <select value={resumeId} onChange={(e) => setResumeId(Number(e.target.value))} className="max-w-full rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-subtle">
                  {usable.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </label>
            ) : (
              <p className="text-[12px] text-muted">
                <Link to="/resume" className="underline underline-offset-2 hover:text-ink">Upload a resume</Link> to tailor it or compare it with this job.
              </p>
            )}
          </header>

          <nav className="sticky top-0 z-10 flex gap-5 border-b border-line bg-surface px-6 text-[13px]">
            {tabs.map(([key, label, badge]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px inline-flex items-center gap-1.5 border-b-2 py-2.5 ${tab === key ? 'border-ink font-medium' : 'border-transparent text-muted hover:text-ink'}`}>
                {label}
                {badge != null && <span className="rounded bg-hover px-1.5 text-[11px] font-medium tabular-nums text-ink">{badge}</span>}
              </button>
            ))}
          </nav>

          <div key={tab} className="drop-in space-y-6 px-6 py-6">
            {tab === 'overview' && (
              <>
                {a ? (
                  <div className="space-y-5">
                    <ResultHead title="AI breakdown" onRedo={() => run('analyze')} busy={busy === 'analyze'} />
                    <p className="text-[14px] leading-relaxed">{a.summary}</p>
                    {a.red_flags?.length > 0 && (
                      <div className="rounded-lg border border-amber-300 px-3 py-2.5 dark:border-amber-700">
                        <p className="flex items-center gap-1.5 text-[13px] font-medium text-amber-700 dark:text-amber-400"><FiAlertTriangle /> Worth checking</p>
                        <div className="mt-1 text-[13px]"><Bullets items={a.red_flags} /></div>
                      </div>
                    )}
                    <Block title="Company overview" show={a.company_overview}>{a.company_overview}</Block>
                    <Block title="Responsibilities" show={a.responsibilities?.length}><Bullets items={a.responsibilities} /></Block>
                    <Block title="Required qualifications" show={a.required_qualifications?.length}><Bullets items={a.required_qualifications} /></Block>
                    <Block title="Preferred qualifications" show={a.preferred_qualifications?.length}><Bullets items={a.preferred_qualifications} /></Block>
                    <Block title="Required technical skills" show={a.technical_skills?.length}>
                      <ul className="flex flex-wrap gap-1.5">{a.technical_skills?.map((s) => <li key={s} className={CHIP}>{s}</li>)}</ul>
                    </Block>
                    <dl className="grid gap-4 rounded-lg bg-hover/60 p-4 sm:grid-cols-3">
                      {[
                        ['Salary and benefits', a.salary_and_benefits ?? job.salary_text],
                        ['Work arrangement', a.work_arrangement ?? SETUPS[job.work_setup]],
                        ['Application deadline', deadline],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-[12px] text-muted">{k}</dt>
                          <dd className="mt-0.5 text-[13px]">{v ?? <span className="text-subtle">Not stated</span>}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <AiPrompt
                    title="Break this job down"
                    text="Responsibilities, required and preferred qualifications, skills, pay, and anything worth checking."
                    action="Analyze job"
                    onClick={() => run('analyze')}
                    busyText={busyFor('analyze')}
                    disabled={!!busy}
                  />
                )}

                <section className="border-t border-line pt-6">
                  <h3 className="text-[13px] font-medium">Job description</h3>
                  <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-ink/80">{job.description}</p>
                  <a href={job.source_url ?? job.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline">
                    Original posting on {SOURCE_NAMES[job.source] ?? job.source} <FiExternalLink className="text-[12px]" />
                  </a>
                </section>
              </>
            )}

            {tab === 'fit' && (job.compatibility ? (
              <div className="space-y-5">
                <ResultHead title="Compatibility" onRedo={() => run('compatibility')} busy={busy === 'compatibility'} />
                <Compatibility c={job.compatibility} />
              </div>
            ) : (
              <AiPrompt
                title="How well does this job fit you?"
                text="A score from 0 to 100, your strengths and gaps, and whether location, setup and pay match your preferences."
                action="Check compatibility"
                onClick={() => run('compatibility')}
                busyText={busyFor('compatibility')}
                disabled={!!busy}
                note={<>Uses your <Link to="/profile" className="underline underline-offset-2 hover:text-ink">Professional Profile</Link>. The more complete it is, the better the check.</>}
              />
            ))}

            {tab === 'resume' && (job.resume_comparison ? (
              <div className="space-y-5">
                <ResultHead title="Resume match" onRedo={() => run('compare')} busy={busy === 'compare'} />
                <Comparison c={job.resume_comparison} resumeTitle={resumes.find((r) => r.id === job.compared_resume_id)?.title} />
              </div>
            ) : (
              <AiPrompt
                title="Compare with your resume"
                text="Each requirement of this job, marked met, partly met or missing, with the evidence from your resume."
                action="Compare resume"
                onClick={() => run('compare')}
                busyText={busyFor('compare')}
                disabled={!!busy || !resumeId}
                note={!resumeId && 'Upload a resume first.'}
              />
            ))}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}


function Score({ value, label }) {
  return (
    <div className="shrink-0 text-center">
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-[12px] text-muted">{label}</p>
    </div>
  )
}

function Compatibility({ c }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-5">
        <Score value={c.score} label="out of 100" />
        <p className="text-[14px] leading-relaxed">{c.verdict}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Block title="Strengths" show={c.strengths?.length}><Bullets items={c.strengths} /></Block>
        <Block title="Gaps" show={c.gaps?.length}><Bullets items={c.gaps} /></Block>
      </div>
      {c.preferences?.length > 0 && (
        <Block title="Your preferences">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {c.preferences.map((p) => (
              <li key={p.preference} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[130px_90px_1fr]">
                <span className="font-medium">{PREFERENCE[p.preference] ?? p.preference}</span>
                <span className={FIT[p.fit]?.[1]}>{FIT[p.fit]?.[0] ?? p.fit}</span>
                <span className="text-muted">{p.note}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
      <Block title="Recommendation">{c.recommendation}</Block>
    </div>
  )
}

function Comparison({ c, resumeTitle }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-5">
        <Score value={`${c.coverage}%`} label="requirements met" />
        <p className="text-[14px] leading-relaxed">
          {c.summary}
          {resumeTitle && <span className="mt-1 block text-[12px] text-muted">Compared with {resumeTitle}</span>}
        </p>
      </div>
      <Block title="Requirements" show={c.requirements?.length}>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {c.requirements?.map((r, i) => {
            const [Icon, color, label] = STATUS[r.status] ?? STATUS.missing
            return (
              <li key={i} className="flex gap-3 px-3 py-2.5">
                <Icon className={`mt-0.5 shrink-0 ${color}`} role="img" aria-label={label} />
                <span>
                  {r.requirement}
                  {r.evidence && <span className="mt-0.5 block text-[12px] text-muted">{r.evidence}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </Block>
      <Block title="Keywords your resume lacks" show={c.missing_keywords?.length}>
        <ul className="flex flex-wrap gap-1.5">{c.missing_keywords?.map((k) => <li key={k} className="rounded-md border border-line px-2 py-0.5 text-[12px]">{k}</li>)}</ul>
      </Block>
      <Block title="Suggestions" show={c.suggestions?.length}><Bullets items={c.suggestions} /></Block>
    </div>
  )
}
