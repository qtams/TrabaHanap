import { useEffect, useRef, useState } from 'react'
import { fetchResumeFile, resumeFileUrl } from '../../../api/resumes.js'

// Keyed by id + file name in the parent, so a replaced file remounts it.
// PDF: the browser's own viewer. DOCX: rendered to HTML with docx-preview (loaded only when needed).
export default function FilePreview({ resume }) {
  const pdf = resume.mime_type === 'application/pdf'
  const box = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pdf) return
    let cancelled = false
    Promise.all([fetchResumeFile(resume.id), import('docx-preview')])
      .then(([blob, { renderAsync }]) => !cancelled && renderAsync(blob, box.current, null, { inWrapper: true, breakPages: true }))
      .catch(() => !cancelled && setError('This DOCX file could not be previewed. You can still download it.'))
    return () => {
      cancelled = true
    }
  }, [resume.id, pdf])

  if (pdf) {
    return (
      <iframe
        key={resume.file_name}
        title={resume.file_name}
        src={resumeFileUrl(resume.id)}
        className="h-[78vh] w-full rounded-lg border border-line bg-white"
      />
    )
  }

  return error ? (
    <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">{error}</p>
  ) : (
    <div ref={box} className="max-h-[78vh] overflow-auto rounded-lg border border-line [&_.docx-wrapper]:bg-hover! [&_.docx-wrapper]:p-4!" />
  )
}
