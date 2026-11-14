import { useState } from 'react'

const FIELD = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-subtle focus:border-subtle'

// Paste a job posting; the backend creates a new tailored version from this resume's verified information.
export default function TailorForm({ onSubmit, busy }) {
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(jobTitle.trim(), jobDescription.trim())
      }}
      className="max-w-2xl space-y-4"
    >
      <p className="text-[13px] leading-relaxed text-muted">
        Paste a job posting and the AI will make a new version of this resume for it. It only reorders, selects and rewords what is
        already in your resume. It never adds experience, skills or qualifications you don&apos;t have, and it lists the job
        requirements you don&apos;t meet so you can decide what to do.
      </p>
      <label className="block">
        <span className="text-[13px] font-medium">Job title</span>
        <input required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. React Developer" className={`${FIELD} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-[13px] font-medium">Job description</span>
        <textarea
          required
          rows={10}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job posting here"
          className={`${FIELD} mt-1.5 resize-y`}
        />
      </label>
      <button disabled={busy} className="rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-50">
        Create tailored version
      </button>
    </form>
  )
}
