// A resume's information (same shape as ResumeDocument) as a real PDF file: selectable text (ATS
// systems can read it), the chosen paper size, and shrunk to fit one page when it can be.
// jsPDF is loaded only when someone downloads.

const MARGIN = 43.2 // 0.6 in, in points
const SCALES = [1, 0.95, 0.9, 0.85, 0.8, 0.76, 0.72, 0.68] // tried in order until it fits one page
const INK = [23, 23, 23]
const MUTED = [90, 90, 90]
const RULE = [205, 205, 205]

const range = (a, b) => [a, b].filter(Boolean).join(' – ')
// The built-in PDF fonts can't draw every character; swap the common ones.
const clean = (t) => String(t ?? '').replace(/₱/g, 'PHP ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ–—•·\n]/g, '')

/** paper: an entry of PAPER (resumeFile.js). */
export async function downloadPdf(data, fileName, paper) {
  const { jsPDF } = await import('jspdf')
  const W = paper.w * 72
  const H = paper.h * 72
  const width = W - 2 * MARGIN

  // Lays the resume out at scale s. Returns the document and how many pages it took.
  const layout = (s) => {
    const doc = new jsPDF({ unit: 'pt', format: [W, H] })
    let y = MARGIN
    let pages = 1
    const font = (size, style = 'normal', color = INK) => {
      doc.setFont('helvetica', style)
      doc.setFontSize(size * s)
      doc.setTextColor(...color)
    }
    const lineHeight = (size) => size * s * 1.3
    const room = (h) => {
      if (y + h > H - MARGIN) {
        doc.addPage([W, H])
        pages++
        y = MARGIN
      }
    }
    const text = (t, size, { style = 'normal', color = INK, indent = 0, gap = 0 } = {}) => {
      font(size, style, color)
      const lines = doc.splitTextToSize(clean(t), width - indent)
      for (const line of lines) {
        room(lineHeight(size))
        doc.text(line, MARGIN + indent, y, { baseline: 'top' })
        y += lineHeight(size)
      }
      y += gap * s
    }
    const heading = (t) => {
      y += 9 * s
      room(lineHeight(8.5) + 30 * s) // keep a heading with at least a line of its section
      font(8.5, 'bold', MUTED)
      doc.text(t.toUpperCase(), MARGIN, y, { baseline: 'top', charSpace: 0.9 * s })
      y += lineHeight(8.5) + 1 * s
      doc.setDrawColor(...RULE)
      doc.setLineWidth(0.6)
      doc.line(MARGIN, y, MARGIN + width, y)
      y += 5 * s
    }
    // Bold left text, grey right-aligned text (dates) on the same line.
    const row = (left, right) => {
      y += 3 * s
      font(9, 'normal', MUTED)
      const rightWidth = right ? doc.getTextWidth(clean(right)) + 10 : 0
      font(10.5, 'bold')
      const lines = doc.splitTextToSize(clean(left), width - rightWidth)
      room(lineHeight(10.5) * lines.length)
      doc.text(lines, MARGIN, y, { baseline: 'top' })
      if (right) {
        font(9, 'normal', MUTED)
        doc.text(clean(right), MARGIN + width, y + 1 * s, { baseline: 'top', align: 'right' })
      }
      y += lineHeight(10.5) * lines.length
    }
    const bullet = (t) => {
      font(9.5)
      const lines = doc.splitTextToSize(clean(t), width - 12 * s)
      lines.forEach((line, i) => {
        room(lineHeight(9.5))
        if (i === 0) doc.text('•', MARGIN + 2 * s, y, { baseline: 'top' })
        doc.text(line, MARGIN + 12 * s, y, { baseline: 'top' })
        y += lineHeight(9.5)
      })
      y += 1.5 * s
    }

    // Header
    text(data.full_name || '', 20, { style: 'bold', gap: 1 })
    if (data.professional_title) text(data.professional_title, 12, { color: MUTED, gap: 2 })
    const c = data.contact ?? {}
    const contact = [c.email, c.phone, c.location, ...(c.links ?? [])].filter(Boolean)
    if (contact.length) text(contact.join('  ·  '), 8.5, { color: MUTED })

    if (data.summary) {
      heading('Summary')
      text(data.summary, 9.5)
    }
    if (data.work_experience?.length) {
      heading('Work experience')
      for (const j of data.work_experience) {
        row(j.position, range(j.start_date, j.end_date))
        const where = [j.company, j.location].filter(Boolean).join(', ')
        if (where) text(where, 9.5, { color: MUTED, gap: 2 })
        for (const r of j.responsibilities ?? []) bullet(r)
      }
    }
    if (data.education?.length) {
      heading('Education')
      for (const e of data.education) {
        row(e.degree || e.school, range(e.start_date, e.end_date))
        if (e.degree) text(e.school, 9.5, { color: MUTED })
        if (e.details) text(e.details, 9.5)
      }
    }
    if (data.technical_skills?.length) {
      heading('Skills')
      text(data.technical_skills.join(' · '), 9.5) // the dot sticks to the skill before it, so no line starts with one
    }
    if (data.projects?.length) {
      heading('Projects')
      for (const p of data.projects) {
        row(p.name)
        if (p.description) text(p.description, 9.5)
        if (p.technologies?.length) text(p.technologies.join(' · '), 8.5, { color: MUTED })
      }
    }
    if (data.certifications?.length) {
      heading('Certifications')
      for (const x of data.certifications) {
        row(x.name, x.date)
        if (x.issuer) text(x.issuer, 9.5, { color: MUTED })
      }
    }
    if (data.languages?.length) {
      heading('Languages')
      text(data.languages.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join(', '), 9.5)
    }

    return { doc, pages }
  }

  // The largest text that still fits on one page (or the smallest readable size if nothing fits).
  let result = null
  for (const s of SCALES) {
    result = layout(s)
    if (result.pages === 1) break
  }
  result.doc.setProperties({ title: fileName, creator: 'TrabaHanap' })
  result.doc.save(`${fileName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Resume'}.pdf`)
  return result.pages
}
