import { FiFileText, FiZap } from 'react-icons/fi'

const date = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

// Versions list. Tailored versions show which job they were made for.
export default function ResumeList({ resumes, selectedId, onSelect }) {
  return (
    <ul className="space-y-0.5">
      {resumes.map((r) => {
        const Icon = r.tailored_from_id ? FiZap : FiFileText
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
                  {r.tailored_from_id ? 'AI tailored' : r.file_name} · {date(r.created_at)}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
