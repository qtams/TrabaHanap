// What the AI changed for this job, and which job requirements the candidate doesn't meet.
export default function TailoringNotes({ resume }) {
  const { changes = [], gaps = [] } = resume.tailoring_notes ?? {}

  return (
    <aside className="space-y-6">
      <div className="rounded-lg border border-line px-4 py-3">
        <p className="text-[12px] text-subtle">Tailored for</p>
        <p className="text-[14px] font-medium">{resume.job_title}</p>
      </div>

      {gaps.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium">Requirements you don&apos;t meet yet</h3>
          <p className="mt-0.5 text-[12px] text-muted">Not added to the resume. Address them in your cover letter or interview if relevant.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed marker:text-subtle">
            {gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </section>
      )}

      {changes.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium">What changed</h3>
          <ul className="mt-2 space-y-3">
            {changes.map((c, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                {c.change}
                <span className="mt-0.5 block text-[12px] text-subtle">Based on: {c.based_on}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
