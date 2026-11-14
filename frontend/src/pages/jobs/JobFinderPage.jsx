import { useCallback, useEffect, useState } from 'react'
import { FiExternalLink, FiLoader } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import * as jobsApi from '../../api/jobs.js'
import { errorMessage, listResumes, tailorResume } from '../../api/resumes.js'
import { promptText } from '../../lib/alerts.js'
import { toast } from '../../lib/toast.js'
import JobCard from './component/JobCard.jsx'
import JobDetails from './component/JobDetails.jsx'
import SearchForm from './component/SearchForm.jsx'
import SearchHistory from './component/SearchHistory.jsx'
import { getProfile } from '../../api/profile.js'
import { searchFromResume } from './fromResume.js'
import { describeSearch, emptySearch, externalLinks, formFromParams, searchParams } from './labels.js'

// "Continue on JobStreet / Indeed": their search page with the same query, in a new tab.
function ExternalLinks({ links }) {
  if (!links?.length) return null
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {links.map((l) => (
        <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 hover:bg-hover">
          <span>
            <span className="block text-[13px] font-medium">Continue on {l.name}</span>
            <span className="block text-[12px] text-muted">Same search, opens {l.name} in a new tab</span>
          </span>
          <FiExternalLink className="shrink-0 text-muted group-hover:text-ink" />
        </a>
      ))}
    </div>
  )
}

const TABS = [['search', 'Search'], ['saved', 'Saved jobs'], ['history', 'Search history']]
const AI = {
  analyze: (job) => jobsApi.analyzeJob(job.id),
  compatibility: (job) => jobsApi.checkCompatibility(job.id),
  compare: (job, resumeId) => jobsApi.compareWithResume(job.id, resumeId),
}

function JobGrid({ jobs, openId, onOpen, onToggleSave, empty }) {
  if (!jobs.length) return <p className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-[13px] text-muted">{empty}</p>
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {jobs.map((job) => <JobCard key={job.id} job={job} selected={job.id === openId} onOpen={onOpen} onToggleSave={onToggleSave} />)}
    </div>
  )
}

export default function JobFinderPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('search')
  const [sources, setSources] = useState([])
  const [form, setForm] = useState(emptySearch())
  const [results, setResults] = useState(null) // { title, jobs, notes, search }
  const [saved, setSaved] = useState([])
  const [searches, setSearches] = useState([])
  const [resumes, setResumes] = useState([])
  const [openJob, setOpenJob] = useState(null)
  const [busy, setBusy] = useState(null) // 'search' | AI action key

  const [suggested, setSuggested] = useState(null) // { form, basedOn } from the profile / resume

  // On open: fill the search from the profile or latest resume, and show related jobs right away.
  useEffect(() => {
    jobsApi.listJobs({ saved: true }).then(setSaved, () => {})
    jobsApi.listSearches().then(setSearches, () => {})
    Promise.all([jobsApi.listSources(), listResumes().catch(() => []), getProfile().catch(() => null)]).then(
      ([list, resumeList, profile]) => {
        setSources(list)
        setResumes(resumeList)
        const resume = resumeList.find((r) => !r.tailored_from_id && r.data)
        const s = searchFromResume({ profile: profile?.data, resume, sources: list })
        setSuggested(s)
        setForm(s?.form ?? emptySearch(list))
        if (s) search(s.form)
      },
      (err) => toast.error(errorMessage(err)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, [])

  // Put an updated job everywhere it is shown.
  const replaceJob = useCallback((job) => {
    const swap = (list) => list.map((j) => (j.id === job.id ? job : j))
    setResults((r) => r && { ...r, jobs: swap(r.jobs) })
    setSaved((list) => (job.saved_at ? [job, ...list.filter((j) => j.id !== job.id)] : list.filter((j) => j.id !== job.id)))
    setOpenJob((open) => (open?.id === job.id ? job : open))
  }, [])

  async function search(params = form) {
    const body = searchParams(params)
    const links = externalLinks(params)
    if (!params.sources.length) return toast.error('Pick at least one platform.')
    if (![params.title, params.keywords, params.company].some((s) => s?.trim())) return toast.error('Enter a job title, keywords or a company.')
    setTab('search')
    // Only JobStreet / Indeed picked: nothing to search here, just the links to their sites.
    if (!body.sources) return setResults({ jobs: [], notes: [], links, title: `Search on ${links.map((l) => l.name).join(' and ')}` })

    setBusy('search')
    try {
      const res = await jobsApi.searchJobs(body)
      setResults({ ...res, links, title: `${res.jobs.length} ${res.jobs.length === 1 ? 'job' : 'jobs'} found` })
      setSearches((list) => [res.search, ...list.filter((x) => x.id !== res.search.id)])
      res.notes.forEach((n) => toast.info(n))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function toggleSave(job) {
    try {
      replaceJob(await (job.saved_at ? jobsApi.unsaveJob(job.id) : jobsApi.saveJob(job.id)))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function runAction(action, job, resumeId) {
    setBusy(action)
    try {
      if (action === 'prepare') {
        // Within the tailor endpoint's limits (title 160, description 20,000 characters).
        await tailorResume(resumeId, `${job.title} at ${job.company}`.slice(0, 160), `${job.title}\n${job.company}\n\n${job.description}`.slice(0, 20000))
        toast.success('Tailored resume created. Opening My Resume.')
        navigate('/resume')
        return
      }
      replaceJob(await AI[action](job, resumeId))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function openSearch(s) {
    try {
      const res = await jobsApi.getSearch(s.id)
      const f = formFromParams(s.params, sources)
      setForm(f)
      setResults({ ...res, notes: [], links: externalLinks(f), title: `${s.name || describeSearch(s.params)}, searched ${new Date(s.created_at).toLocaleDateString('en-PH')}` })
      setTab('search')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function nameSearch(s) {
    let name = null
    if (!s.name) {
      name = await promptText({ title: 'Save search', label: 'Search name', value: describeSearch(s.params).slice(0, 80), confirmText: 'Save' })
      if (!name) return
    }
    try {
      const updated = await jobsApi.nameSearch(s.id, name)
      setSearches((list) => list.map((x) => (x.id === s.id ? updated : x)))
      setResults((r) => (r?.search?.id === s.id ? { ...r, search: updated } : r))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function removeSearch(s) {
    try {
      await jobsApi.deleteSearch(s.id)
      setSearches((list) => list.filter((x) => x.id !== s.id))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function showDiscovered() {
    try {
      const jobs = await jobsApi.listJobs()
      setResults({ jobs, notes: [], title: `Previously discovered jobs (${jobs.length})` })
      setTab('search')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const closeJob = useCallback(() => setOpenJob(null), [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Find jobs</h2>
        <p className="mt-1 text-[13px] text-muted">
          Searches job boards and company career sites that allow it. Open a job to have the AI break it down or check how well it fits you.
        </p>
      </div>

      <nav className="flex gap-5 border-b border-line text-[13px]">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px border-b-2 pb-2.5 ${tab === key ? 'border-ink font-medium' : 'border-transparent text-muted hover:text-ink'}`}>
            {label}{key === 'saved' && saved.length ? ` (${saved.length})` : ''}
          </button>
        ))}
      </nav>

      <div key={tab} className="drop-in space-y-6">
        {tab === 'search' && (
          <>
            <SearchForm
              value={form}
              onChange={setForm}
              onSubmit={() => search()}
              sources={sources}
              busy={busy === 'search'}
              suggested={suggested}
              onUseSuggested={() => { setForm(suggested.form); search(suggested.form) }}
            />
            {results && (
              <section key={results.search?.id ?? results.title} className="drop-in space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[14px] font-medium">{results.title}</h3>
                  {results.search && (
                    <button type="button" onClick={() => nameSearch(results.search)} className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline">
                      {results.search.name ? `Saved as "${results.search.name}"` : 'Save this search'}
                    </button>
                  )}
                </div>
                <ExternalLinks links={results.links} />
                {(results.jobs.length > 0 || results.search) && (
                  <JobGrid jobs={results.jobs} openId={openJob?.id} onOpen={setOpenJob} onToggleSave={toggleSave} empty="No jobs match here. Try fewer words, another location, or fewer filters." />
                )}
              </section>
            )}
            {!results && busy === 'search' && (
              <p className="flex items-center gap-2 text-[13px] text-muted"><FiLoader className="animate-spin" /> Finding jobs related to your resume…</p>
            )}
            {!results && busy !== 'search' && (
              <p className="text-[12px] text-muted">
                Searched here: Himalayas and Remotive (remote jobs), plus company career sites on Greenhouse and Lever. JobStreet and Indeed have no public search API, so they open on their own site with your search.
              </p>
            )}
          </>
        )}

        {tab === 'saved' && (
          <JobGrid jobs={saved} openId={openJob?.id} onOpen={setOpenJob} onToggleSave={toggleSave} empty="Jobs you save will show here." />
        )}

        {tab === 'history' && (
          <SearchHistory searches={searches} onOpen={openSearch} onRerun={(s) => { const f = formFromParams(s.params, sources); setForm(f); search(f) }} onName={nameSearch} onDelete={removeSearch} onShowDiscovered={showDiscovered} />
        )}
      </div>

      {openJob && (
        <JobDetails key={openJob.id} job={openJob} resumes={resumes} busy={busy !== 'search' ? busy : null} onClose={closeJob} onToggleSave={toggleSave} onAction={runAction} />
      )}
    </div>
  )
}
