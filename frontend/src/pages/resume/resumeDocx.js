// A resume's information (same shape as ResumeDocument) as a Word file, built in the browser.
// Loaded only when someone downloads, so the docx library isn't in the main bundle.

const range = (a, b) => [a, b].filter(Boolean).join(' – ')

/** paper: an entry of PAPER (resumeFile.js), for the page size. */
export async function downloadDocx(data, fileName, paper) {
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopType, TextRun } = await import('docx')

  const FONT = 'Calibri'
  const text = (t, opts = {}) => new TextRun({ text: t ?? '', font: FONT, size: 21, ...opts }) // 10.5 pt
  const muted = (t) => text(t, { color: '555555' })
  const RIGHT = paper.twips[0] - 864 * 2 // right tab stop at the text width, in twips

  const heading = (t) => new Paragraph({
    children: [text(t.toUpperCase(), { bold: true, size: 19, color: '333333' })],
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 2 } },
  })
  // "Position ……… dates" on one line.
  const row = (left, right) => new Paragraph({
    children: [text(left, { bold: true }), ...(right ? [text(`\t${right}`, { color: '555555', size: 19 })] : [])],
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT }],
    spacing: { before: 120 },
  })
  const line = (t) => new Paragraph({ children: [muted(t)] })
  const bullet = (t) => new Paragraph({ children: [text(t)], bullet: { level: 0 }, spacing: { after: 40 } })

  const c = data.contact ?? {}
  const contact = [c.email, c.phone, c.location, ...(c.links ?? [])].filter(Boolean)
  const body = []

  body.push(new Paragraph({ children: [text(data.full_name || '', { bold: true, size: 36 })], alignment: AlignmentType.LEFT }))
  if (data.professional_title) body.push(new Paragraph({ children: [text(data.professional_title, { size: 24, color: '444444' })] }))
  if (contact.length) body.push(new Paragraph({ children: [muted(contact.join('  ·  '))], spacing: { before: 80 } }))

  if (data.summary) {
    body.push(heading('Summary'), new Paragraph({ children: [text(data.summary)] }))
  }
  if (data.work_experience?.length) {
    body.push(heading('Work experience'))
    for (const j of data.work_experience) {
      body.push(row(j.position, range(j.start_date, j.end_date)))
      const where = [j.company, j.location].filter(Boolean).join(', ')
      if (where) body.push(line(where))
      for (const r of j.responsibilities ?? []) body.push(bullet(r))
    }
  }
  if (data.education?.length) {
    body.push(heading('Education'))
    for (const e of data.education) {
      body.push(row(e.school, range(e.start_date, e.end_date)))
      if (e.degree) body.push(line(e.degree))
      if (e.details) body.push(new Paragraph({ children: [text(e.details)] }))
    }
  }
  if (data.technical_skills?.length) {
    body.push(heading('Skills'), new Paragraph({ children: [text(data.technical_skills.join(' · '))] }))
  }
  if (data.certifications?.length) {
    body.push(heading('Certifications'))
    for (const x of data.certifications) body.push(row(x.name, x.date), ...(x.issuer ? [line(x.issuer)] : []))
  }
  if (data.projects?.length) {
    body.push(heading('Projects'))
    for (const p of data.projects) {
      body.push(row(p.name))
      if (p.description) body.push(new Paragraph({ children: [text(p.description)] }))
      if (p.technologies?.length) body.push(line(p.technologies.join(' · ')))
    }
  }
  if (data.languages?.length) {
    body.push(heading('Languages'), new Paragraph({
      children: [text(data.languages.map((l) => [l.language, l.proficiency].filter(Boolean).join(' (') + (l.proficiency ? ')' : '')).join(' · '))],
    }))
  }

  const doc = new Document({
    creator: 'TrabaHanap',
    title: fileName,
    sections: [{
      properties: {
        page: {
          size: { width: paper.twips[0], height: paper.twips[1] },
          margin: { top: 864, bottom: 864, left: 864, right: 864 }, // 0.6 in, as when printing
        },
      },
      children: body,
    }],
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Resume'}.docx` })
  a.click()
  URL.revokeObjectURL(url)
}
