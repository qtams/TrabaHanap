import { useRef, useState } from 'react'
import { FiUploadCloud } from 'react-icons/fi'

import { ACCEPT, MAX_MB } from '../resumeFile.js'

// Click or drag a PDF/DOCX onto it. `compact` = one-line version for the sidebar list.
export default function UploadDropzone({ onFile, disabled, compact = false, label = 'Upload resume' }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)

  const pick = (file) => file && !disabled && onFile(file)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && input.current.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        pick(e.dataTransfer.files[0])
      }}
      className={`cursor-pointer rounded-lg border border-dashed text-center transition-colors outline-none focus-visible:border-ink ${
        over ? 'border-ink bg-hover' : 'border-line hover:border-subtle hover:bg-hover/50'
      } ${disabled ? 'pointer-events-none opacity-50' : ''} ${compact ? 'px-3 py-3' : 'px-6 py-14'}`}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          pick(e.target.files[0])
          e.target.value = ''
        }}
      />
      {compact ? (
        <p className="flex items-center justify-center gap-2 text-[13px] text-muted">
          <FiUploadCloud /> {label}
        </p>
      ) : (
        <>
          <FiUploadCloud className="mx-auto text-2xl text-subtle" />
          <p className="mt-3 text-[14px] font-medium">Drop your resume here, or click to browse</p>
          <p className="mt-1 text-[13px] text-muted">PDF or DOCX, up to {MAX_MB} MB</p>
        </>
      )}
    </div>
  )
}
