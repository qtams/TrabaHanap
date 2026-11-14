export const ACCEPT = '.pdf,.docx'
export const MAX_MB = 10

// Returns an error string, or null when the file is fine.
export function checkFile(file) {
  if (!/\.(pdf|docx)$/i.test(file.name)) return 'Only PDF and DOCX files are supported.'
  if (file.size > MAX_MB * 1024 * 1024) return `File is larger than ${MAX_MB} MB.`
  return null
}

// What kind of AI version a resume is: 'built' | 'improved' | 'tailored', or null for an uploaded file.
export const aiKind = (r) => (r.file_path ? null : r.tailoring_notes?.kind ?? (r.job_title ? 'tailored' : 'built'))

// Paper sizes for the resume sheet, print (PDF) and Word. In the Philippines "short bond" is Letter
// and "long bond" is Legal (8.5 × 13 in); A4 for jobs abroad. twips = Word page size (1 in = 1440).
export const PAPER = {
  letter: { label: 'Short bond', hint: 'Letter · 8.5 × 11 in', w: 8.5, h: 11, css: 'letter', twips: [12240, 15840] },
  a4: { label: 'A4', hint: '8.27 × 11.69 in · abroad', w: 8.27, h: 11.69, css: 'A4', twips: [11906, 16838] },
  legal: { label: 'Long bond', hint: 'Legal · 8.5 × 13 in', w: 8.5, h: 13, css: '8.5in 13in', twips: [12240, 18720] },
}
const PAPER_KEY = 'resume-paper'
export const savedPaper = () => {
  try {
    return PAPER[localStorage.getItem(PAPER_KEY)] ? localStorage.getItem(PAPER_KEY) : 'letter'
  } catch {
    return 'letter'
  }
}
export const savePaper = (key) => {
  try {
    localStorage.setItem(PAPER_KEY, key)
  } catch {
    // storage blocked: the choice lasts for this visit
  }
}

const MARGIN = 0.6 // inches, all sides
const DPI = 96 // CSS pixels per inch
const MIN_ZOOM = 0.62 // below this the text gets too small to read; it then runs onto a second page

/**
 * Print just the resume sheet on the chosen paper ("Save as PDF" in the print dialog): a copy of the
 * sheet at the top of the page, no browser header/footer, shrunk to fit ONE page when it's longer.
 */
export function printResume(paperKey) {
  const sheet = document.querySelector('.print-area')
  if (!sheet) return
  const paper = PAPER[paperKey] ?? PAPER.letter
  const textWidth = (paper.w - 2 * MARGIN) * DPI
  const textHeight = (paper.h - 2 * MARGIN) * DPI

  // #print-root holds the page margin; the inner box is the content, scaled to fit.
  document.getElementById('print-root')?.remove()
  const root = Object.assign(document.createElement('div'), { id: 'print-root' })
  const inner = document.createElement('div')
  inner.append(sheet.cloneNode(true))
  root.append(inner)
  document.body.append(root)
  inner.querySelector('.paper-page').style.cssText = 'padding:0;min-height:0;background-image:none'

  // Measure off-screen at the page's text width, then shrink until it fits one page. Shrinking leaves
  // room for longer lines (so fewer of them): measure again at the new width a few times.
  root.style.cssText = 'display:block;position:fixed;left:-10000px;top:0;background:#fff'
  const heightAt = (zoom) => {
    inner.style.cssText = `width:${textWidth / zoom}px`
    return inner.scrollHeight * zoom
  }
  let zoom = 1
  for (let i = 0; i < 4 && heightAt(zoom) > textHeight && zoom > MIN_ZOOM; i++) {
    zoom = Math.max(MIN_ZOOM, zoom * (textHeight / heightAt(zoom)) * 0.98)
  }
  inner.style.cssText = `width:${textWidth / zoom}px;zoom:${zoom}`
  root.style.cssText = `padding:${MARGIN}in`

  // Page size with no page margin, so the browser adds no header/footer (date, URL, page numbers).
  let style = document.getElementById('resume-page-size')
  if (!style) {
    style = Object.assign(document.createElement('style'), { id: 'resume-page-size' })
    document.head.append(style)
  }
  style.textContent = `@page { size: ${paper.css}; margin: 0; }`

  window.addEventListener('afterprint', () => root.remove(), { once: true })
  window.print()
}
