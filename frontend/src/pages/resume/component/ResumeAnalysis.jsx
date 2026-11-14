const CRITERIA = {
  completeness: 'Completeness',
  relevant_skills: 'Relevant skills',
  work_experience: 'Work experience',
  professional_summary: 'Professional summary',
  formatting_readability: 'Formatting & readability',
}

const PRIORITY = {
  high: 'text-red-600 dark:text-red-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-muted',
}

function List({ title, items }) {
  if (!items?.length) return null
  return (
    <section>
      <h3 className="text-[14px] font-medium">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed marker:text-subtle">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </section>
  )
}

export default function ResumeAnalysis({ analysis }) {
  const order = { high: 0, medium: 1, low: 2 }
  const suggestions = [...(analysis.suggestions ?? [])].sort((a, b) => order[a.priority] - order[b.priority])

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-6">
        <div className="shrink-0 text-center">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{analysis.overall_score}</p>
          <p className="text-[12px] text-subtle">out of 100</p>
        </div>
        <p className="text-[14px] leading-relaxed">{analysis.verdict}</p>
      </div>

      <section className="divide-y divide-line rounded-lg border border-line">
        {analysis.criteria?.map((c) => (
          <div key={c.key} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[200px_1fr]">
            <div>
              <div className="flex items-baseline justify-between text-[13px] font-medium sm:block">
                {CRITERIA[c.key] ?? c.key}
                <span className="text-muted tabular-nums sm:ml-2">{c.score}/10</span>
              </div>
              <div className="mt-1.5 h-1 w-full rounded-full bg-hover sm:w-32">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(10, Math.max(0, c.score)) * 10}%` }} />
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">{c.assessment}</p>
          </div>
        ))}
      </section>

      {suggestions.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium">Suggested improvements</h3>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-3 px-4 py-3 text-[13px] leading-relaxed">
                <span className={`w-14 shrink-0 text-[12px] font-medium capitalize ${PRIORITY[s.priority]}`}>{s.priority}</span>
                {s.suggestion}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <List title="Strengths" items={analysis.strengths} />
        <List title="Missing information" items={analysis.missing_information} />
      </div>
    </div>
  )
}
