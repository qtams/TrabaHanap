import { PAPER } from '../resumeFile.js'

// The resume information laid out as a sheet of bond paper: always white, real proportions, margins,
// and a faint line where each page ends. Also what gets printed for "Save as PDF" (.print-area).

const range = (a, b) => [a, b].filter(Boolean).join(' – ')

function Section({ title, show, children }) {
  if (!show) return null
  return (
    <section className="mt-5 break-inside-avoid-page">
      <h3 className="border-b border-neutral-300 pb-1 text-[11px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">{title}</h3>
      <div className="mt-2.5 space-y-3.5">{children}</div>
    </section>
  )
}

function Row({ left, right, sub }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-[13.5px] font-semibold">{left}</p>
        {right && <p className="text-[12px] text-neutral-500 tabular-nums">{right}</p>}
      </div>
      {sub && <p className="text-[12.5px] text-neutral-600">{sub}</p>}
    </div>
  )
}

/** paper: a key of PAPER (letter = short bond, a4, legal = long bond). */
export default function ResumeDocument({ data, paper = 'letter' }) {
  const size = PAPER[paper] ?? PAPER.letter
  const c = data.contact ?? {}
  const contact = [c.email, c.phone, c.location, ...(c.links ?? [])].filter(Boolean)
  // Sizes scale with the sheet's width (cqw), so a narrow screen shows a smaller sheet, same shape.
  const page = `calc(100cqw * ${size.h / size.w})`
  const margin = `calc(100cqw * ${0.6 / size.w})`

  return (
    <div className="paper-desk rounded-lg bg-neutral-100 p-3 sm:p-8 dark:bg-neutral-900">
      <article
        className="print-area paper mx-auto w-full bg-white text-neutral-900 shadow-[0_1px_3px_rgb(0_0_0/0.08),0_8px_30px_-8px_rgb(0_0_0/0.25)] ring-1 ring-black/5"
        style={{ maxWidth: `${size.w}in`, containerType: 'inline-size' }}
      >
        <div
          className="paper-page"
          style={{
            minHeight: page,
            padding: margin,
            // A faint line where each page ends, so it's clear when it runs onto a second page.
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent calc(${page} - 1px), rgb(0 0 0 / 0.12) calc(${page} - 1px), rgb(0 0 0 / 0.12) ${page})`,
          }}
        >
          <header>
            <h2 className="text-[24px] leading-tight font-bold tracking-tight">{data.full_name || 'Name not found'}</h2>
            {data.professional_title && <p className="mt-0.5 text-[14.5px] text-neutral-600">{data.professional_title}</p>}
            {contact.length > 0 && <p className="mt-1.5 text-[12px] break-words text-neutral-600">{contact.join('  ·  ')}</p>}
          </header>

          <Section title="Summary" show={data.summary}>
            <p className="text-[13px] leading-relaxed">{data.summary}</p>
          </Section>

          <Section title="Work experience" show={data.work_experience?.length}>
            {data.work_experience?.map((w, i) => (
              <div key={i} className="break-inside-avoid">
                <Row left={w.position} right={range(w.start_date, w.end_date)} sub={[w.company, w.location].filter(Boolean).join(', ')} />
                {w.responsibilities?.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed marker:text-neutral-400">
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
                {e.details && <p className="mt-0.5 text-[12.5px] text-neutral-600">{e.details}</p>}
              </div>
            ))}
          </Section>

          <Section title="Skills" show={data.technical_skills?.length}>
            <p className="text-[12.5px] leading-relaxed">{data.technical_skills?.join('  ·  ')}</p>
          </Section>

          <Section title="Projects" show={data.projects?.length}>
            {data.projects?.map((p, i) => (
              <div key={i}>
                <Row left={p.name} sub={p.description} />
                {p.technologies?.length > 0 && <p className="mt-0.5 text-[12px] text-neutral-500">{p.technologies.join(' · ')}</p>}
              </div>
            ))}
          </Section>

          <Section title="Certifications" show={data.certifications?.length}>
            {data.certifications?.map((cert, i) => (
              <Row key={i} left={cert.name} right={cert.date} sub={cert.issuer} />
            ))}
          </Section>

          <Section title="Languages" show={data.languages?.length}>
            <p className="text-[12.5px]">
              {data.languages?.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join(', ')}
            </p>
          </Section>
        </div>
      </article>
    </div>
  )
}
