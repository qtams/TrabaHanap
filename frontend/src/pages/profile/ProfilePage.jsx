import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCheck, FiDownload, FiEdit2, FiLoader, FiPlus, FiZap } from 'react-icons/fi'
import * as profileApi from '../../api/profile.js'
import { errorMessage, listResumes } from '../../api/resumes.js'
import { confirm } from '../../lib/alerts.js'
import { toast } from '../../lib/toast.js'
import { Choices, Field, Lines, Select, Text, TextArea } from '../../components/fields.jsx'
import MonthField from '../../components/MonthField.jsx'
import SidePanel from '../../components/SidePanel.jsx'
import RecordList from '../../components/RecordList.jsx'
import TagPicker, { InlineTags } from '../../components/TagPicker.jsx'
import { ALL_SKILLS } from '../../data/skills.js'
import SkillsEditor, { SkillsSummary } from './SkillsEditor.jsx'
import {
  INDUSTRY_NAMES, LOCATION_NAMES, SKILL_LABELS, TITLE_NAMES, categoryOf, isTechProfile, locationHint, skillsIn,
  suggestIndustries, suggestLocations, suggestTitles,
} from './suggest.js'
import { mergeProfile } from './mergeProfile.js'

const SECTIONS = [
  ['personal', 'Personal information'],
  ['summary', 'Professional summary'],
  ['experience', 'Work experience'],
  ['education', 'Education'],
  ['skills', 'Skills'],
  ['credentials', 'Certifications & projects'],
  ['preferences', 'Career preferences'],
]

const EMPLOYMENT_TYPES = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship' }
const STATUS = { employed: 'Employed', unemployed: 'Looking for work', freelancing: 'Freelancing', student: 'Student' }
const SETUPS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite' }
const LEVELS = {
  entry: 'Entry level / fresh graduate',
  junior: 'Junior (about 1–2 years)',
  mid: 'Mid-level (about 3–5 years)',
  senior: 'Senior (5+ years)',
  lead: 'Lead, supervisor or manager',
}
const BLANK = {
  experience: { company: '', title: '', employment_type: '', start_date: '', end_date: '', responsibilities: [], achievements: [], technologies: [] },
  education: { school: '', degree: '', field_of_study: '', graduation_date: '' },
  certification: { name: '', issuer: '', date: '', link: '', description: '' },
  project: { name: '', description: '', date: '', link: '', technologies: [] },
}

function Section({ id, title, hint, action, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

const grid = 'grid gap-4 sm:grid-cols-2'

// ---- Save errors: the server's keys ("data.experience.2.title") in words people understand ----
const FIELD_NAMES = {
  full_name: 'Full name', email: 'Email address', phone: 'Phone number', location: 'Location', linkedin: 'LinkedIn',
  github: 'GitHub', portfolio: 'Website', years_experience: 'Years of experience', company: 'Company name',
  title: 'Job title', school: 'School', degree: 'Degree', name: 'Name', link: 'Link', salary_min: 'Expected salary',
  salary_max: 'Maximum salary', salary_currency: 'Currency', work_setups: 'Work setup', employment_types: 'Employment type',
}
const LIST_NOUN = { experience: 'Work experience', education: 'Education', certifications: 'Certification', projects: 'Project' }
const SECTION_OF = { certifications: 'credentials', projects: 'credentials' }

function friendly(key, message) {
  const [section, ...rest] = key.replace(/^data\./, '').split('.')
  const index = /^\d+$/.test(rest[0]) ? Number(rest.shift()) : null
  const field = rest.find((p) => !/^\d+$/.test(p)) ?? section
  const label = FIELD_NAMES[field] ?? field.replace(/_/g, ' ')
  const text = /required when/.test(message)
    ? 'Add a job title or a company name.'
    : message.replace(/^The (.+?) field/, label) // "The email address field must be…" → "Email address must be…"
  return { section, index, text: index !== null && LIST_NOUN[section] ? `${LIST_NOUN[section]} #${index + 1}: ${text}` : text }
}

// When a section counts as complete, for the checks in "On this page".
const filled = (v) => (typeof v === 'string' ? v.trim() !== '' : v != null)
const COMPLETE = {
  personal: (d) => ['full_name', 'email', 'phone', 'location'].every((k) => filled(d.personal[k])),
  summary: (d) => filled(d.summary.introduction) && filled(d.summary.career_objective),
  experience: (d) => d.experience.some((j) => filled(j.company) && filled(j.title)),
  education: (d) => d.education.some((e) => filled(e.school)),
  skills: (d) => Object.values(d.skills).flat().length >= 3,
  credentials: (d) => d.certifications.length + d.projects.length > 0,
  preferences: (d) => d.preferences.job_titles.length > 0 && d.preferences.locations.length > 0,
}

// "Technologies used" for a job or project: search the skill list; suggest skills its text names.
function Technologies({ value, onChange, texts, tech }) {
  return (
    <InlineTags
      value={value}
      onChange={onChange}
      names={ALL_SKILLS}
      hintOf={(n) => SKILL_LABELS[categoryOf(n)]}
      suggestions={skillsIn(texts, value)}
      placeholder={tech ? 'Type a tool, language or skill' : 'Type a tool, software or skill'}
      label={tech ? 'Add a technology' : 'Add a tool or skill'}
    />
  )
}

// Career preferences edited in the side panel.
const PREF_PANELS = {
  job_titles: {
    title: 'Preferred job titles', description: 'Every role you would take. Used to find and rank jobs for you.',
    names: TITLE_NAMES, suggest: suggestTitles, placeholder: 'e.g. Front-End Developer', allowCustom: true,
    suggestedLabel: 'Suggested from your experience and skills', addedLabel: 'Your job titles',
  },
  industries: {
    title: 'Preferred industries', description: 'Kinds of companies you would like to work for.',
    names: INDUSTRY_NAMES, suggest: suggestIndustries, placeholder: 'e.g. Fintech, BPO, Healthcare', allowCustom: true,
    suggestedLabel: 'Suggested for your field', addedLabel: 'Your industries',
  },
  locations: {
    title: 'Preferred locations', description: 'Where you would like to work. Places in the Philippines only.',
    names: LOCATION_NAMES, hintOf: locationHint, suggest: suggestLocations, placeholder: 'e.g. Makati, Cebu City, Pampanga', allowCustom: false,
    help: 'Pick a city, province or region from the list.', suggestedLabel: 'Suggested for you', addedLabel: 'Your locations',
  },
}

// A list shown as chips on the page, edited in the side panel.
function PanelField({ label, items, onEdit, empty = 'None yet' }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted hover:bg-hover hover:text-ink">
          <FiEdit2 className="text-[11px]" /> {items.length ? 'Edit' : 'Add'}
        </button>
      </div>
      {items.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">{items.map((x) => <li key={x} className="rounded-full bg-hover px-3 py-1 text-[13px]">{x}</li>)}</ul>
      ) : (
        <button type="button" onClick={onEdit} className="mt-1.5 w-full rounded-md border border-dashed border-line px-3 py-2.5 text-left text-[13px] text-subtle hover:border-subtle hover:text-muted">{empty}</button>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null) // server response: { data, newer_resume, synced_at, ... }
  const [data, setData] = useState(null) // the form
  const [syncedResumeId, setSyncedResumeId] = useState(null) // set by an import, sent with the next save
  const [busy, setBusy] = useState(null) // 'save' | 'import' | 'summary'
  const [picker, setPicker] = useState(null) // resumes to import from, while the menu is open
  const [savedJson, setSavedJson] = useState('') // last saved form, to tell unsaved changes
  const [extraLinks, setExtraLinks] = useState([]) // 'github' | 'portfolio' the user chose to add
  const [panel, setPanel] = useState(null)
  const [errors, setErrors] = useState({}) // from the last failed save: { "data.personal.email": [message] } // 'skills' | a PREF_PANELS key, while the side panel is open

  const dirty = data !== null && JSON.stringify(data) !== savedJson

  const load = (p) => {
    setProfile(p)
    setData(p.data)
    setSavedJson(JSON.stringify(p.data))
  }

  useEffect(() => {
    profileApi.getProfile().then(load, (err) => toast.error(errorMessage(err)))
  }, [])

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Editing a section clears its save errors.
  const clearErrors = (section) => setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`data.${section}.`))))
  const set = (section, value) => { setData((d) => ({ ...d, [section]: value })); clearErrors(section) }
  const patch = (section, values) => { setData((d) => ({ ...d, [section]: { ...d[section], ...values } })); clearErrors(section) }
  const err = (path) => errors[`data.${path}`] && friendly(`data.${path}`, errors[`data.${path}`][0]).text
  // { index: [messages] } for a list section, for RecordList.
  const listErrors = (section) => Object.entries(errors).reduce((acc, [key, msgs]) => {
    const { section: s, index, text } = friendly(key, msgs[0])
    if (s === section && index !== null) (acc[index] ??= []).push(text)
    return acc
  }, {})

  async function save(e) {
    e.preventDefault()
    setBusy('save')
    try {
      load(await profileApi.saveProfile(data, syncedResumeId))
      setSyncedResumeId(null)
      setErrors({})
      toast.success('Profile saved.')
    } catch (e) {
      const found = e.response?.status === 422 && e.response.data?.errors
      if (!found) return toast.error(errorMessage(e))
      setErrors(found)
      const [firstKey, firstMsgs] = Object.entries(found)[0]
      const first = friendly(firstKey, firstMsgs[0])
      const more = Object.keys(found).length - 1
      toast.error(`${first.text}${more ? ` (and ${more} more)` : ''}`)
      // Take them to it once the red marks are on screen.
      setTimeout(() => {
        const sectionEl = document.getElementById(SECTION_OF[first.section] ?? first.section)
        const target = sectionEl?.querySelector('[data-error]') ?? sectionEl
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 60)
    } finally {
      setBusy(null)
    }
  }

  async function openPicker() {
    try {
      const resumes = (await listResumes()).filter((r) => !r.tailored_from_id && r.extracted_at)
      if (!resumes.length) return toast.info('Upload a resume on My Resume first; its information can then be imported here.')
      setPicker(resumes)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function importFrom(resume) {
    setPicker(null)
    setBusy('import')
    try {
      const result = await profileApi.importFromResume(resume.id)
      setData((d) => mergeProfile(d, result.data))
      setSyncedResumeId(result.resume_id)
      toast.success(`Imported from "${resume.title}". Review the changes, then save.`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function writeSummary() {
    const s = data.summary
    const hasText = [s.introduction, s.career_objective, s.career_goals].some(filled)
    if (hasText && !(await confirm({ title: 'Replace your summary?', text: 'The AI will rewrite the introduction, career objective and career goals from your profile. You can still edit them, or Discard before saving.', confirmText: 'Write with AI' }))) return
    setBusy('summary')
    try {
      const draft = await profileApi.writeSummary(data)
      patch('summary', draft)
      toast.success('Summary drafted from your profile. Read it over, edit, then save.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (!data) return <p className="text-[13px] text-muted">Loading…</p>

  const { personal, summary, skills, preferences } = data
  const tech = isTechProfile(data)
  const LINKS = { github: ['GitHub', 'https://github.com/…'], portfolio: [tech ? 'Portfolio website' : 'Website or online portfolio', 'https://…'] }
  const shownLinks = Object.keys(LINKS).filter((k) => personal[k] || tech || extraLinks.includes(k))
  const addableLinks = Object.keys(LINKS).filter((k) => !shownLinks.includes(k))
  const done = Object.fromEntries(SECTIONS.map(([id]) => [id, COMPLETE[id](data)]))
  const doneCount = Object.values(done).filter(Boolean).length
  const newer = profile.newer_resume && profile.newer_resume.id !== syncedResumeId ? profile.newer_resume : null

  return (
    <form onSubmit={save} className="grid gap-10 pb-24 xl:grid-cols-[1fr_200px]">
      <div className="min-w-0 max-w-3xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your professional background</h2>
            <p className="mt-1 max-w-xl text-[13px] text-muted">
              The AI uses this as its main reference when it evaluates jobs and tailors your resume. Keep it complete and accurate.
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={openPicker}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[13px] hover:bg-hover disabled:opacity-50"
            >
              {busy === 'import' ? <FiLoader className="animate-spin" /> : <FiDownload />} Import from resume
            </button>
            {picker && (
              <div className="drop-in absolute right-0 z-10 mt-1 w-64 rounded-lg border border-line bg-surface p-1 shadow-lg" onMouseLeave={() => setPicker(null)}>
                {picker.map((r) => (
                  <button key={r.id} type="button" onClick={() => importFrom(r)} className="block w-full truncate rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-hover">
                    {r.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {busy === 'import' && <p className="flex items-center gap-2 text-[13px] text-muted"><FiLoader className="animate-spin" /> Reading your resume into the profile. This can take up to a minute.</p>}

        {newer && !busy && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-[13px]">
            <span>
              <span className="font-medium">{newer.title}</span>
              <span className="text-muted"> has information that may not be in your profile yet.</span>
            </span>
            <button type="button" onClick={() => importFrom(newer)} className="font-medium underline-offset-4 hover:underline">Import it</button>
          </div>
        )}

        <Section id="personal" title="Personal information">
          <div className={grid}>
            <Field label="Full name" error={err('personal.full_name')}><Text value={personal.full_name} onChange={(v) => patch('personal', { full_name: v })} autoComplete="name" /></Field>
            <Field label="Email address" error={err('personal.email')}><Text type="email" value={personal.email} onChange={(v) => patch('personal', { email: v })} autoComplete="email" /></Field>
            <Field label="Phone number" error={err('personal.phone')}><Text type="tel" value={personal.phone} onChange={(v) => patch('personal', { phone: v })} autoComplete="tel" /></Field>
            <Field label="Current location" error={err('personal.location')}><Text value={personal.location} onChange={(v) => patch('personal', { location: v })} placeholder="e.g. Quezon City, Philippines" /></Field>
            <Field label="LinkedIn" error={err('personal.linkedin')}><Text type="url" value={personal.linkedin} onChange={(v) => patch('personal', { linkedin: v })} placeholder="https://linkedin.com/in/…" /></Field>
            {shownLinks.map((k) => (
              <Field key={k} label={LINKS[k][0]} hint="optional" error={err(`personal.${k}`)} className={extraLinks.includes(k) ? 'drop-in' : ''}>
                <Text type="url" value={personal[k]} onChange={(v) => patch('personal', { [k]: v })} placeholder={LINKS[k][1]} />
              </Field>
            ))}
          </div>
          {addableLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-subtle">Have one?</span>
              {addableLinks.map((k) => (
                <button key={k} type="button" onClick={() => setExtraLinks((l) => [...l, k])} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-[12px] text-muted hover:border-subtle hover:text-ink">
                  <FiPlus className="text-[11px]" /> {LINKS[k][0]}
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section
          id="summary"
          title="Professional summary"
          hint="Write it yourself, or let the AI draft it from the rest of your profile."
          action={(
            <button type="button" onClick={writeSummary} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[13px] hover:bg-hover disabled:opacity-50">
              {busy === 'summary' ? <FiLoader className="animate-spin" /> : <FiZap />} {busy === 'summary' ? 'Writing…' : 'Write with AI'}
            </button>
          )}
        >
          <Field label="Professional introduction"><TextArea rows={4} value={summary.introduction} onChange={(v) => patch('summary', { introduction: v })} /></Field>
          <Field label="Career objective"><TextArea value={summary.career_objective} onChange={(v) => patch('summary', { career_objective: v })} /></Field>
          <Field label="Career goals"><TextArea value={summary.career_goals} onChange={(v) => patch('summary', { career_goals: v })} /></Field>
          <div className={grid}>
            <Field label="Years of experience" error={err('summary.years_experience')}>
              <Text type="number" min="0" max="60" step="0.5" value={summary.years_experience ?? ''} onChange={(v) => patch('summary', { years_experience: v === '' ? null : Number(v) })} />
            </Field>
            <Field label="Current employment status"><Select value={summary.employment_status} onChange={(v) => patch('summary', { employment_status: v })} options={STATUS} /></Field>
          </div>
        </Section>

        <Section id="experience" title="Work experience" hint="Most recent first.">
          <RecordList
            items={data.experience}
            onChange={(v) => set('experience', v)}
            blank={BLANK.experience}
            noun="work experience"
            addAt="start"
            panelWidth="max-w-[560px]"
            panelDescription="One job or role, including part-time, freelance or volunteer work. Only a job title or a company is needed; add the rest if you have it."
            isValid={(j) => filled(j.company) || filled(j.title)}
            errors={listErrors('experience')}
            describe={(j) => ({
              title: j.title,
              subtitle: [j.company, EMPLOYMENT_TYPES[j.employment_type]].filter(Boolean).join(' · '),
              meta: [[j.start_date, j.end_date].filter(Boolean).join(' – '), j.technologies.slice(0, 5).join(', ')].filter(Boolean).join(' · '),
            })}
          >
            {(job, update) => (
              <>
                <Field label="Job title" hint="or a company name"><Text value={job.title} onChange={(v) => update({ title: v })} placeholder="e.g. Customer Service Representative" /></Field>
                <Field label="Company name" hint="optional if you add a job title"><Text value={job.company} onChange={(v) => update({ company: v })} /></Field>
                <Field label="Employment type"><Select value={job.employment_type} onChange={(v) => update({ employment_type: v })} options={EMPLOYMENT_TYPES} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field group label="Start date"><MonthField value={job.start_date} onChange={(v) => update({ start_date: v })} placeholder="Start" /></Field>
                  <Field group label="End date"><MonthField value={job.end_date} onChange={(v) => update({ end_date: v })} placeholder="End or Present" present min={job.start_date} /></Field>
                </div>
                <Field label="Responsibilities" hint="one per line"><Lines rows={5} value={job.responsibilities} onChange={(v) => update({ responsibilities: v })} placeholder="What you did day to day" /></Field>
                <Field label="Achievements" hint="one per line, with results where you can"><Lines rows={3} value={job.achievements} onChange={(v) => update({ achievements: v })} placeholder="e.g. Kept a 95% customer satisfaction score for 6 months" /></Field>
                <Field group label={tech ? 'Technologies used' : 'Tools and skills used'}><Technologies tech={tech} value={job.technologies} onChange={(v) => update({ technologies: v })} texts={[job.title, ...job.responsibilities, ...job.achievements]} /></Field>
              </>
            )}
          </RecordList>
        </Section>

        <Section id="education" title="Educational background">
          <RecordList
            items={data.education}
            onChange={(v) => set('education', v)}
            blank={BLANK.education}
            noun="education"
            panelDescription="A school, college, university or training center."
            isValid={(e) => filled(e.school) || filled(e.degree)}
            errors={listErrors('education')}
            describe={(e) => ({
              title: e.school,
              subtitle: [e.degree, e.field_of_study].filter(Boolean).join(' in '),
              meta: e.graduation_date && `Graduated ${e.graduation_date}`,
            })}
          >
            {(edu, update) => (
              <>
                <Field label="School or university"><Text value={edu.school} onChange={(v) => update({ school: v })} placeholder="e.g. University of the Philippines Diliman" /></Field>
                <Field label="Degree"><Text value={edu.degree} onChange={(v) => update({ degree: v })} placeholder="e.g. Bachelor of Science, Senior High School, NC II" /></Field>
                <Field label="Field of study"><Text value={edu.field_of_study} onChange={(v) => update({ field_of_study: v })} placeholder="e.g. Information Technology, Nursing, ABM" /></Field>
                <Field group label="Graduation date" hint="or expected"><MonthField value={edu.graduation_date} onChange={(v) => update({ graduation_date: v })} placeholder="Select month" max={null} /></Field>
              </>
            )}
          </RecordList>
        </Section>

        <Section id="skills" title="Skills" hint="Any field, not only tech.">
          <SkillsSummary skills={skills} />
          <button type="button" onClick={() => setPanel('skills')} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[13px] hover:bg-hover">
            <FiEdit2 className="text-[12px]" /> Edit skills
          </button>
        </Section>

        <Section id="credentials" title="Certifications & projects">
          <h3 className="text-[13px] font-medium text-muted">Certifications</h3>
          <RecordList
            items={data.certifications}
            onChange={(v) => set('certifications', v)}
            blank={BLANK.certification}
            noun="certification"
            panelDescription="Licenses, certificates and courses that show what you know."
            isValid={(c) => filled(c.name)}
            errors={listErrors('certifications')}
            describe={(c) => ({ title: c.name, subtitle: c.issuer, meta: c.date, link: c.link })}
          >
            {(cert, update) => (
              <>
                <Field label="Name"><Text value={cert.name} onChange={(v) => update({ name: v })} placeholder="e.g. AWS Certified Cloud Practitioner" /></Field>
                <Field label="Issuing organization"><Text value={cert.issuer} onChange={(v) => update({ issuer: v })} placeholder="e.g. Amazon Web Services, TESDA" /></Field>
                <Field group label="Date earned"><MonthField value={cert.date} onChange={(v) => update({ date: v })} /></Field>
                <Field label="Credential link" hint="optional"><Text type="url" value={cert.link} onChange={(v) => update({ link: v })} placeholder="https://…" /></Field>
                <Field label="Description" hint="optional"><TextArea rows={3} value={cert.description} onChange={(v) => update({ description: v })} /></Field>
              </>
            )}
          </RecordList>

          <h3 className="pt-4 text-[13px] font-medium text-muted">{tech ? 'Portfolio projects' : 'Projects and work samples'}</h3>
          <RecordList
            items={data.projects}
            onChange={(v) => set('projects', v)}
            blank={BLANK.project}
            noun="project"
            panelDescription={tech ? 'Work you can show: apps, websites, designs, case studies.' : 'Work you can show: events you ran, campaigns, reports, designs, programs you led.'}
            isValid={(p) => filled(p.name)}
            errors={listErrors('projects')}
            describe={(p) => ({ title: p.name, subtitle: p.technologies.join(' · '), meta: p.date, link: p.link })}
          >
            {(project, update) => (
              <>
                <Field label="Project name"><Text value={project.name} onChange={(v) => update({ name: v })} /></Field>
                <Field group label="Date"><MonthField value={project.date} onChange={(v) => update({ date: v })} /></Field>
                <Field label="Link" hint="optional"><Text type="url" value={project.link} onChange={(v) => update({ link: v })} placeholder="https://…" /></Field>
                <Field label="Description"><TextArea rows={4} value={project.description} onChange={(v) => update({ description: v })} placeholder="What it does, your part in it, and the result." /></Field>
                <Field group label={tech ? 'Technologies used' : 'Tools and skills used'}><Technologies tech={tech} value={project.technologies} onChange={(v) => update({ technologies: v })} texts={[project.name, project.description]} /></Field>
              </>
            )}
          </RecordList>
        </Section>

        <Section id="preferences" title="Career preferences" hint="Used to match jobs. Never put on your resume.">
          {Object.entries(PREF_PANELS).map(([key, p]) => (
            <PanelField key={key} label={p.title} items={preferences[key]} onEdit={() => setPanel(key)} empty={`Add ${p.title.toLowerCase()}`} />
          ))}
          <Field group label="Work setup"><Choices value={preferences.work_setups} onChange={(v) => patch('preferences', { work_setups: v })} options={SETUPS} /></Field>
          <Field group label="Employment type"><Choices value={preferences.employment_types} onChange={(v) => patch('preferences', { employment_types: v })} options={EMPLOYMENT_TYPES} /></Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_110px]">
            <Field label="Expected salary" hint="monthly, minimum">
              <Text type="number" min="0" step="1000" value={preferences.salary_min ?? ''} onChange={(v) => patch('preferences', { salary_min: v === '' ? null : Number(v) })} />
            </Field>
            <Field label="Maximum" hint="optional" error={err('preferences.salary_max')}>
              <Text type="number" min="0" step="1000" value={preferences.salary_max ?? ''} onChange={(v) => patch('preferences', { salary_max: v === '' ? null : Number(v) })} />
            </Field>
            <Field label="Currency"><Select value={preferences.salary_currency} onChange={(v) => patch('preferences', { salary_currency: v })} options={{ PHP: 'PHP', USD: 'USD' }} placeholder="—" /></Field>
          </div>
          <Field label="Preferred experience level"><Select value={preferences.experience_level} onChange={(v) => patch('preferences', { experience_level: v })} options={LEVELS} /></Field>
        </Section>
      </div>

      <nav className="sticky top-22 hidden self-start xl:block">
        <p className="text-[12px] font-medium text-subtle">On this page</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-online transition-[width] duration-500" style={{ width: `${(doneCount / SECTIONS.length) * 100}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-subtle">{doneCount}/{SECTIONS.length}</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-[13px]">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className={`flex items-center gap-2 ${done[id] ? 'text-ink' : 'text-muted'} hover:text-ink`}>
                <span
                  aria-label={done[id] ? 'Complete' : 'Not complete'}
                  className={`grid size-4 shrink-0 place-items-center rounded-full transition-colors ${done[id] ? 'bg-online text-white' : 'border border-line'}`}
                >
                  {done[id] && <FiCheck className="text-[10px]" strokeWidth={3} />}
                </span>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[12px] leading-relaxed text-subtle">
          Upload documents on <Link to="/resume" className="underline underline-offset-2 hover:text-ink">My Resume</Link>, then import them here.
        </p>
      </nav>

      {panel === 'skills' && (
        <SidePanel title="Edit skills" description="Help employers find you by showing all of your skills, from any field." onClose={() => setPanel(null)} footer={<SaveHint />}>
          <SkillsEditor skills={skills} profile={data} onChange={(v) => set('skills', v)} />
        </SidePanel>
      )}
      {PREF_PANELS[panel] && (
        <SidePanel title={PREF_PANELS[panel].title} description={PREF_PANELS[panel].description} onClose={() => setPanel(null)} footer={<SaveHint />}>
          <TagPicker
            {...PREF_PANELS[panel]}
            label="Add"
            value={preferences[panel]}
            onChange={(v) => patch('preferences', { [panel]: v })}
            suggestions={PREF_PANELS[panel].suggest(data, new Set(preferences[panel].map((x) => x.toLowerCase())))}
          />
        </SidePanel>
      )}

      {dirty && (
        <div className="drop-in fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur lg:left-(--sidebar-w)">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3 lg:px-8">
            <span className="mr-auto text-[13px] text-muted">{syncedResumeId ? 'Imported from your resume. Review, then save.' : 'Unsaved changes'}</span>
            <button type="button" onClick={() => { setData(JSON.parse(savedJson)); setSyncedResumeId(null); setErrors({}) }} className="rounded-md px-3 py-1.5 text-[13px] text-muted hover:bg-hover hover:text-ink">
              Discard
            </button>
            <button disabled={busy === 'save'} className="rounded-md bg-ink px-3.5 py-1.5 text-[13px] font-medium text-on-ink hover:opacity-85 disabled:opacity-50">
              {busy === 'save' ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

function SaveHint() {
  return <span className="mr-auto text-[12px] text-muted">Changes are kept here; click Save profile to save them.</span>
}
