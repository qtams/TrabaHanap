import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiDownload, FiEdit2, FiFileText, FiLoader, FiRefreshCw, FiStar, FiTrash2, FiTrendingUp } from 'react-icons/fi'
import * as resumesApi from '../../api/resumes.js'
import { confirm } from '../../lib/alerts.js'
import { toast } from '../../lib/toast.js'
import FilePreview from './component/FilePreview.jsx'
import ResumeAnalysis from './component/ResumeAnalysis.jsx'
import ResumeDocument from './component/ResumeDocument.jsx'
import DownloadMenu from './component/DownloadMenu.jsx'
import ResumeList from './component/ResumeList.jsx'
import TailorForm from './component/TailorForm.jsx'
import TailoringNotes from './component/TailoringNotes.jsx'
import UploadDropzone from './component/UploadDropzone.jsx'
import { ACCEPT, PAPER, aiKind, checkFile, savePaper, savedPaper } from './resumeFile.js'

const BUSY_TEXT = {
  upload: 'Uploading…',
  extract: 'Reading your resume. This can take up to a minute.',
  analyze: 'Reviewing your resume. This can take up to a minute.',
  tailor: 'Tailoring your resume to the job. This can take up to two minutes.',
  build: 'Writing your resume from your Professional Profile. This can take up to two minutes.',
  improve: 'Rewriting your resume to make it stronger. This can take up to two minutes.',
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
  const [paper, setPaper] = useState(savedPaper) // letter (short bond) | a4 | legal (long bond)
  const choosePaper = (key) => { setPaper(key); savePaper(key) }
  const replaceInput = useRef(null)

  const selected = resumes?.find((r) => r.id === selectedId)
  const kind = selected ? aiKind(selected) : null // null = an uploaded file
  const tailored = kind !== null // written by the AI: shown as a document, downloaded as PDF / Word

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

  // No resume: the AI writes one from the Professional Profile.
  async function build() {
    const resume = await run('build', () => resumesApi.buildResume())
    if (!resume) return
    put(resume)
    select(resume.id)
    toast.success('Your resume is ready. Check it, then download it or make it stronger.')
  }

  // A stronger rewrite of this version, as a new version.
  async function improve() {
    const resume = await run('improve', () => resumesApi.improveResume(selected.id))
    if (!resume) return
    put(resume)
    select(resume.id)
    toast.success('Stronger version created. Analyze it to see the new score.')
  }

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
      <div className="mx-auto max-w-3xl pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Your resume</h2>
        <p className="mt-1 mb-6 text-[13px] text-muted">Upload the one you have, or let the AI write one for you.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="drop-in space-y-3 rounded-lg border border-line p-5">
            <p className="flex items-center gap-2 text-[14px] font-medium"><FiFileText /> I have a resume</p>
            <p className="text-[13px] text-muted">The AI reads it, pulls out your experience, skills and education, and tells you how to make it stronger.</p>
            <UploadDropzone onFile={upload} disabled={!!busy} />
          </div>
          <div className="drop-in flex flex-col gap-3 rounded-lg border border-line p-5">
            <p className="flex items-center gap-2 text-[14px] font-medium"><FiStar /> I don’t have one yet</p>
            <p className="text-[13px] text-muted">
              The AI writes a complete, professional resume from your <Link to="/profile" className="underline underline-offset-2 hover:text-ink">Professional Profile</Link>: strong summary, clear bullets, your skills. It never adds anything you didn’t write.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-[12px] text-muted marker:text-subtle">
              <li>Fill in your work experience, education and skills in your profile.</li>
              <li>Come back and build your resume.</li>
              <li>Download it as PDF or Word.</li>
            </ol>
            <button onClick={build} disabled={!!busy} className={`${PRIMARY} mt-auto inline-flex items-center justify-center gap-1.5`}>
              <FiStar /> Build my resume with AI
            </button>
          </div>
        </div>
        {busy && <p className="mt-4 flex items-center gap-2 text-[13px] text-muted"><FiLoader className="animate-spin" /> {BUSY_TEXT[busy]}</p>}
      </div>
    )
  }

  const notesCount = (selected?.tailoring_notes?.gaps?.length ?? 0) + (selected?.tailoring_notes?.changes?.length ?? 0)
  const notesTab = ['notes', `AI notes${notesCount ? ` (${notesCount})` : ''}`]
  const tabs = kind === 'tailored'
    ? [['preview', 'Resume'], notesTab, ['analysis', 'Analysis']]
    : tailored
      ? [['preview', 'Resume'], notesTab, ['analysis', 'Analysis'], ['tailor', 'Tailor to a job']]
      : [['preview', 'Preview'], ['info', 'Information'], ['analysis', 'Analysis'], ['tailor', 'Tailor to a job']]

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <p className="px-1 text-[12px] font-medium text-subtle">Versions</p>
        <ResumeList resumes={resumes} selectedId={selectedId} onSelect={select} />
        <UploadDropzone compact onFile={upload} disabled={!!busy} label="Upload new version" />
        <button onClick={build} disabled={!!busy} className={`${BTN} w-full justify-center`} title="Write a resume from your Professional Profile">
          <FiStar /> Build one with AI
        </button>
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
                <DownloadMenu data={selected.data} title={selected.title} paper={paper} disabled={!selected.data || !!busy} />
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
                previousScore={resumes.find((r) => r.id === selected.tailored_from_id)?.analysis?.overall_score}
                paper={paper}
                onPaper={choosePaper}
                busy={!!busy}
                onExtract={() => extract(selected.id)}
                onAnalyze={analyze}
                onImprove={improve}
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

// After the analysis: one click for a stronger rewrite.
function ImproveCard({ resume, busy, onImprove }) {
  const score = resume.analysis?.overall_score
  return (
    <div className="drop-in flex flex-wrap items-center gap-4 rounded-lg border border-line bg-hover/40 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-on-ink"><FiTrendingUp /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{score >= 90 ? 'Already strong. Polish it further?' : 'Make it stronger with AI'}</p>
        <p className="mt-0.5 text-[12px] text-muted">
          Rewrites your resume using these suggestions: stronger summary, action-verb bullets, best order. Saved as a new version; this one stays. It never invents experience, numbers or skills, and lists what you could add.
        </p>
      </div>
      <button onClick={onImprove} disabled={busy} className={`${PRIMARY} inline-flex items-center gap-1.5`}>
        <FiTrendingUp /> Make it stronger
      </button>
    </div>
  )
}

// Paper size for the sheet, PDF and Word: short bond (Letter), A4, long bond (Legal).
function PaperPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-subtle">Paper</span>
      <div role="radiogroup" aria-label="Paper size" className="inline-flex rounded-md border border-line p-0.5">
        {Object.entries(PAPER).map(([key, p]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            title={p.hint}
            onClick={() => onChange(key)}
            className={`rounded px-2.5 py-1 text-[12px] transition-colors ${value === key ? 'bg-ink font-medium text-on-ink' : 'text-muted hover:text-ink'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <span className="text-[12px] text-subtle">{PAPER[value].hint}</span>
    </div>
  )
}

function TabContent({ tab, resume, tailored, previousScore, paper, onPaper, busy, onExtract, onAnalyze, onImprove, onTailor }) {
  const needsExtract = <Empty text="The AI hasn't read this resume yet." action="Extract information" onClick={onExtract} disabled={busy} />

  if (tab === 'preview') {
    if (!tailored) return <FilePreview key={`${resume.id}-${resume.file_name}`} resume={resume} />
    return (
      <div className="space-y-3">
        <PaperPicker value={paper} onChange={onPaper} />
        <ResumeDocument data={resume.data} paper={paper} />
        <p className="text-[12px] text-subtle">The faint line marks where a page ends. PDF and Word use this paper size. What the AI changed and what you could add are in AI notes.</p>
      </div>
    )
  }

  if (tab === 'notes') {
    return (
      <div className="max-w-2xl">
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
        <PaperPicker value={paper} onChange={onPaper} />
        <ResumeDocument data={resume.data} paper={paper} />
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
        <ImproveCard resume={resume} busy={busy} onImprove={onImprove} />
        <ResumeAnalysis analysis={resume.analysis} previous={previousScore} />
      </div>
    )
  }

  if (tab === 'tailor') {
    if (!resume.data) return needsExtract
    return <TailorForm onSubmit={onTailor} busy={busy} />
  }

  return null
}
