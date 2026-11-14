import { useEffect, useRef, useState } from 'react'
import { FiDownload, FiEdit2, FiLoader, FiPrinter, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import * as resumesApi from '../../api/resumes.js'
import { confirm } from '../../lib/alerts.js'
import { toast } from '../../lib/toast.js'
import FilePreview from './component/FilePreview.jsx'
import ResumeAnalysis from './component/ResumeAnalysis.jsx'
import ResumeDocument from './component/ResumeDocument.jsx'
import ResumeList from './component/ResumeList.jsx'
import TailorForm from './component/TailorForm.jsx'
import TailoringNotes from './component/TailoringNotes.jsx'
import UploadDropzone from './component/UploadDropzone.jsx'
import { ACCEPT, checkFile } from './resumeFile.js'

const BUSY_TEXT = {
  upload: 'Uploading…',
  extract: 'Reading your resume. This can take up to a minute.',
  analyze: 'Reviewing your resume. This can take up to a minute.',
  tailor: 'Tailoring your resume to the job. This can take up to two minutes.',
}
const BTN = 'inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[13px] hover:bg-hover disabled:opacity-50'
const PRIMARY = 'rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-50'

const titleFromFile = (name) => name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim() || 'My resume'

export default function ResumePage() {
  const [resumes, setResumes] = useState(null) // null = loading
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('preview')
  const [busy, setBusy] = useState(null) // key of BUSY_TEXT while an action runs
  const [renaming, setRenaming] = useState(false)
  const replaceInput = useRef(null)

  const selected = resumes?.find((r) => r.id === selectedId)
  const tailored = Boolean(selected?.tailored_from_id)

  useEffect(() => {
    resumesApi
      .listResumes()
      .then((list) => {
        setResumes(list)
        setSelectedId(list[0]?.id ?? null)
      })
      .catch((err) => {
        setResumes([])
        toast.error(resumesApi.errorMessage(err))
      })
  }, [])

  const put = (resume) => setResumes((list) => (list.some((r) => r.id === resume.id) ? list.map((r) => (r.id === resume.id ? resume : r)) : [resume, ...list]))

  const select = (id) => {
    setSelectedId(id)
    setTab('preview')
    setRenaming(false)
  }

  // Run one action with the busy overlay and error toast. Returns the result, or undefined on failure.
  async function run(kind, fn) {
    setBusy(kind)
    try {
      return await fn()
    } catch (err) {
      toast.error(resumesApi.errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const extract = (id) =>
    run('extract', async () => {
      put(await resumesApi.extractResume(id))
      toast.success('Resume information extracted.')
    })

  async function upload(file) {
    const problem = checkFile(file)
    if (problem) return toast.error(problem)
    const resume = await run('upload', () => resumesApi.uploadResume(titleFromFile(file.name), file))
    if (!resume) return
    put(resume)
    select(resume.id)
    setTab('info')
    extract(resume.id)
  }

  async function replace(file) {
    const problem = checkFile(file)
    if (problem) return toast.error(problem)
    const ok = await confirm({ title: 'Replace this file?', text: 'The extracted information and analysis will be redone for the new file.', confirmText: 'Replace' })
    if (!ok) return
    const resume = await run('upload', () => resumesApi.replaceResumeFile(selected.id, file))
    if (!resume) return
    put(resume)
    extract(resume.id)
  }

  async function remove() {
    const ok = await confirm({ title: `Delete "${selected.title}"?`, text: 'This removes the file and everything the AI extracted from it.', confirmText: 'Delete', tone: 'danger' })
    if (!ok) return
    await run('delete', async () => {
      await resumesApi.deleteResume(selected.id)
      const rest = resumes.filter((r) => r.id !== selected.id)
      setResumes(rest)
      select(rest[0]?.id ?? null)
      toast.success('Resume deleted.')
    })
  }

  async function rename(title) {
    setRenaming(false)
    if (!title || title === selected.title) return
    const resume = await run('rename', () => resumesApi.renameResume(selected.id, title))
    if (resume) put(resume)
  }

  const analyze = () =>
    run('analyze', async () => {
      put(await resumesApi.analyzeResume(selected.id))
    })

  async function tailor(jobTitle, jobDescription) {
    const resume = await run('tailor', () => resumesApi.tailorResume(selected.id, jobTitle, jobDescription))
    if (!resume) return
    put(resume)
    select(resume.id)
    toast.success('Tailored version created.')
  }

  if (resumes === null) return <p className="text-[13px] text-muted">Loading…</p>

  if (resumes.length === 0) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Upload your resume</h2>
        <p className="mt-1 mb-6 text-[13px] text-muted">
          The AI reads it, pulls out your experience, skills and education, and tells you how to make it stronger.
        </p>
        <UploadDropzone onFile={upload} disabled={!!busy} />
        {busy && <p className="mt-4 flex items-center gap-2 text-[13px] text-muted"><FiLoader className="animate-spin" /> {BUSY_TEXT[busy]}</p>}
      </div>
    )
  }

  const tabs = tailored
    ? [['preview', 'Resume'], ['analysis', 'Analysis']]
    : [['preview', 'Preview'], ['info', 'Information'], ['analysis', 'Analysis'], ['tailor', 'Tailor to a job']]

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <p className="px-1 text-[12px] font-medium text-subtle">Versions</p>
        <ResumeList resumes={resumes} selectedId={selectedId} onSelect={select} />
        <UploadDropzone compact onFile={upload} disabled={!!busy} label="Upload new version" />
      </aside>

      {selected && (
        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {renaming ? (
              <input
                autoFocus
                defaultValue={selected.title}
                onBlur={(e) => rename(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setRenaming(false)
                }}
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-lg font-semibold tracking-tight outline-none focus:border-subtle"
              />
            ) : (
              <button onClick={() => setRenaming(true)} className="group flex min-w-0 items-center gap-2 text-left" title="Rename">
                <h2 className="truncate text-lg font-semibold tracking-tight">{selected.title}</h2>
                <FiEdit2 className="shrink-0 text-[13px] text-subtle opacity-0 group-hover:opacity-100" />
              </button>
            )}

            <div className="ml-auto flex flex-wrap gap-2">
              {tailored ? (
                <button onClick={() => window.print()} className={BTN} disabled={!selected.data}>
                  <FiPrinter /> Save as PDF
                </button>
              ) : (
                <>
                  <a href={resumesApi.resumeDownloadUrl(selected.id)} className={BTN}>
                    <FiDownload /> Download
                  </a>
                  <button onClick={() => replaceInput.current.click()} className={BTN} disabled={!!busy}>
                    <FiRefreshCw /> Replace
                  </button>
                  <input ref={replaceInput} type="file" accept={ACCEPT} hidden onChange={(e) => { if (e.target.files[0]) replace(e.target.files[0]); e.target.value = '' }} />
                </>
              )}
              <button onClick={remove} className={`${BTN} hover:border-red-300 hover:text-red-600`} disabled={!!busy}>
                <FiTrash2 /> Delete
              </button>
            </div>
          </div>

          <nav className="mt-5 flex gap-5 border-b border-line text-[13px]">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 pb-2.5 transition-colors ${tab === key ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div key={`${selected.id}-${tab}`} className="drop-in mt-6">
            {busy && BUSY_TEXT[busy] && busy !== 'upload' ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line py-20 text-center">
                <FiLoader className="animate-spin text-xl text-muted" />
                <p className="mt-3 text-[13px] text-muted">{BUSY_TEXT[busy]}</p>
              </div>
            ) : (
              <TabContent
                tab={tab}
                resume={selected}
                tailored={tailored}
                busy={!!busy}
                onExtract={() => extract(selected.id)}
                onAnalyze={analyze}
                onTailor={tailor}
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function Empty({ text, action, onClick, disabled }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
      <p className="text-[13px] text-muted">{text}</p>
      <button onClick={onClick} disabled={disabled} className={`${PRIMARY} mt-4`}>{action}</button>
    </div>
  )
}

function TabContent({ tab, resume, tailored, busy, onExtract, onAnalyze, onTailor }) {
  const needsExtract = <Empty text="The AI hasn't read this resume yet." action="Extract information" onClick={onExtract} disabled={busy} />

  if (tab === 'preview') {
    if (!tailored) return <FilePreview key={`${resume.id}-${resume.file_name}`} resume={resume} />
    return (
      <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
        <ResumeDocument data={resume.data} />
        <TailoringNotes resume={resume} />
      </div>
    )
  }

  if (tab === 'info') {
    if (!resume.data) return needsExtract
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-subtle">Extracted by AI. Check it matches your resume before tailoring.</p>
          <button onClick={onExtract} disabled={busy} className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">Extract again</button>
        </div>
        <ResumeDocument data={resume.data} />
      </div>
    )
  }

  if (tab === 'analysis') {
    if (!resume.data) return needsExtract
    if (!resume.analysis) return <Empty text="Get a score, what's missing, and how to improve it." action="Analyze resume" onClick={onAnalyze} disabled={busy} />
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button onClick={onAnalyze} disabled={busy} className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">Analyze again</button>
        </div>
        <ResumeAnalysis analysis={resume.analysis} />
      </div>
    )
  }

  if (tab === 'tailor') {
    if (!resume.data) return needsExtract
    return <TailorForm onSubmit={onTailor} busy={busy} />
  }

  return null
}
