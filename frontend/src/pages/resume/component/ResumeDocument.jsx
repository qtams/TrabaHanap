// The extracted (or tailored) information laid out as a clean resume.
// Also what gets printed for "Save as PDF" (see .print-area in index.css).

const range = (a, b) => [a, b].filter(Boolean).join(' – ')

function Section({ title, show, children }) {
  if (!show) return null
  return (
    <section className="mt-6 break-inside-avoid-page">
      <h3 className="border-b border-line pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  )
}

function Row({ left, right, sub }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-[14px] font-medium">{left}</p>
        {right && <p className="text-[12px] text-muted tabular-nums">{right}</p>}
      </div>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
    </div>
  )
}

export default function ResumeDocument({ data }) {
  const c = data.contact ?? {}
  const contact = [c.email, c.phone, c.location, ...(c.links ?? [])].filter(Boolean)

  return (
    <article className="print-area rounded-lg border border-line px-6 py-8 sm:px-10">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{data.full_name || 'Name not found'}</h2>
        {data.professional_title && <p className="mt-0.5 text-[15px] text-muted">{data.professional_title}</p>}
        {contact.length > 0 && <p className="mt-2 text-[13px] text-muted">{contact.join('  ·  ')}</p>}
      </header>

      <Section title="Summary" show={data.summary}>
        <p className="text-[14px] leading-relaxed">{data.summary}</p>
      </Section>

      <Section title="Work experience" show={data.work_experience?.length}>
        {data.work_experience?.map((w, i) => (
          <div key={i}>
            <Row left={w.position} right={range(w.start_date, w.end_date)} sub={[w.company, w.location].filter(Boolean).join(', ')} />
            {w.responsibilities?.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed marker:text-subtle">
                {w.responsibilities.map((r, j) => <li key={j}>{r}</li>)}
              </ul>
            )}
          </div>
        ))}
      </Section>

      <Section title="Education" show={data.education?.length}>
        {data.education?.map((e, i) => (
          <div key={i}>
            <Row left={e.degree || e.school} right={range(e.start_date, e.end_date)} sub={e.degree ? e.school : null} />
            {e.details && <p className="mt-1 text-[13px] text-muted">{e.details}</p>}
          </div>
        ))}
      </Section>

      <Section title="Technical skills" show={data.technical_skills?.length}>
        <ul className="flex flex-wrap gap-1.5">
          {data.technical_skills?.map((s) => (
            <li key={s} className="rounded-md border border-line px-2 py-0.5 text-[12px]">{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="Projects" show={data.projects?.length}>
        {data.projects?.map((p, i) => (
          <div key={i}>
            <Row left={p.name} sub={p.description} />
            {p.technologies?.length > 0 && <p className="mt-1 text-[12px] text-subtle">{p.technologies.join(' · ')}</p>}
          </div>
        ))}
      </Section>

      <Section title="Certifications" show={data.certifications?.length}>
        {data.certifications?.map((cert, i) => (
          <Row key={i} left={cert.name} right={cert.date} sub={cert.issuer} />
        ))}
      </Section>

      <Section title="Languages" show={data.languages?.length}>
        <p className="text-[13px]">
          {data.languages?.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join(', ')}
        </p>
      </Section>
    </article>
  )
}
