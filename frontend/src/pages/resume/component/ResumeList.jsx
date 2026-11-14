import { FiFileText, FiStar, FiTrendingUp, FiZap } from 'react-icons/fi'
import { aiKind } from '../resumeFile.js'

const date = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

// Versions list: uploaded files, and versions the AI wrote (built, improved, tailored to a job).
const KIND = { built: [FiStar, 'Built by AI'], improved: [FiTrendingUp, 'Improved by AI'], tailored: [FiZap, 'AI tailored'] }
export default function ResumeList({ resumes, selectedId, onSelect }) {
  return (
    <ul className="space-y-0.5">
      {resumes.map((r) => {
        const kind = aiKind(r)
        const [Icon, label] = KIND[kind] ?? [FiFileText, r.file_name]
        return (
          <li key={r.id}>
            <button
              onClick={() => onSelect(r.id)}
              className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                r.id === selectedId ? 'bg-hover' : 'hover:bg-hover/60'
              }`}
            >
              <Icon className="mt-0.5 shrink-0 text-[14px] text-muted" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{r.title}</span>
                <span className="block truncate text-[12px] text-subtle">
                  {label} · {date(r.created_at)}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
