import { useEffect, useRef, useState } from 'react'
import { FaFilePdf, FaFileWord, FaPrint } from 'react-icons/fa6'
import { FiChevronDown, FiDownload, FiLoader } from 'react-icons/fi'
import { toast } from '../../../lib/toast.js'
import { PAPER, printResume } from '../resumeFile.js'
import { downloadDocx } from '../resumeDocx.js'
import { downloadPdf } from '../resumePdf.js'

const ITEMS = [
  {
    key: 'pdf', icon: FaFilePdf, color: 'text-red-600', label: 'PDF document', hint: 'One page, ready to send or upload',
    run: async ({ data, title, paper }) => {
      const pages = await downloadPdf(data, title, PAPER[paper])
      toast.success(pages > 1 ? `PDF downloaded (${pages} pages: too long to fit one).` : 'PDF downloaded.')
    },
  },
  {
    key: 'word', icon: FaFileWord, color: 'text-blue-600', label: 'Word document', hint: '.docx · opens in Word and Google Docs',
    run: async ({ data, title, paper }) => {
      await downloadDocx(data, title, PAPER[paper])
      toast.success('Word file downloaded.')
    },
  },
  {
    key: 'print', icon: FaPrint, color: 'text-muted', label: 'Print', hint: 'Send it to a printer', divider: true,
    run: ({ paper }) => printResume(paper),
  },
]

/** "Download ▾": PDF, Word or print, on the chosen paper size. */
export default function DownloadMenu({ data, title, paper, disabled }) {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(null) // key while a file is being made
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  async function choose(item) {
    setOpen(false)
    setWorking(item.key)
    try {
      await item.run({ data, title, paper })
    } catch {
      toast.error(`Could not make the ${item.label.toLowerCase()}.`)
    } finally {
      setWorking(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || !!working}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-50"
      >
        {working ? <FiLoader className="animate-spin" /> : <FiDownload />}
        {working ? 'Preparing…' : 'Download'}
        <FiChevronDown className={`text-[13px] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="drop-in absolute right-0 z-30 mt-1.5 w-72 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          <p className="px-2.5 pt-1 pb-1.5 text-[11px] text-subtle">On {PAPER[paper].label.toLowerCase()} paper ({PAPER[paper].hint})</p>
          {ITEMS.map((item) => (
            <div key={item.key}>
              {item.divider && <div className="my-1 h-px bg-line" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => choose(item)}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-hover"
              >
                <item.icon className={`shrink-0 text-[20px] ${item.color}`} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  <span className="block text-[12px] text-muted">{item.hint}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
