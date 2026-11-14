const HEAD = {
  built: ['Built by AI', 'From your Professional Profile. Nothing added that isn’t in it.'],
  improved: ['Improved by AI', 'A stronger rewrite of your resume, using its analysis. Nothing invented.'],
}
const GAPS = {
  tailored: ['Requirements you don’t meet yet', 'Not added to the resume. Address them in your cover letter or interview if relevant.'],
  other: ['Add these if they’re true', 'The AI can’t add what it doesn’t know. These would make your resume stronger.'],
}

// What the AI changed and why, and what's missing (job requirements, or things only the candidate can add).
export default function TailoringNotes({ resume }) {
  const { changes = [], gaps = [], kind = resume.job_title ? 'tailored' : 'built' } = resume.tailoring_notes ?? {}
  const [gapTitle, gapHint] = GAPS[kind === 'tailored' ? 'tailored' : 'other']

  return (
    <aside className="space-y-6">
      <div className="rounded-lg border border-line px-4 py-3">
        {kind === 'tailored' ? (
          <>
            <p className="text-[12px] text-subtle">Tailored for</p>
            <p className="text-[14px] font-medium">{resume.job_title}</p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-medium">{HEAD[kind]?.[0]}</p>
            <p className="mt-0.5 text-[12px] text-subtle">{HEAD[kind]?.[1]}</p>
          </>
        )}
      </div>

      {gaps.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium">{gapTitle}</h3>
          <p className="mt-0.5 text-[12px] text-muted">{gapHint}</p>
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
