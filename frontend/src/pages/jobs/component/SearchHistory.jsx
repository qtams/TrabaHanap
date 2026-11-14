import { FiStar, FiTrash2 } from 'react-icons/fi'
import { describeSearch, formatDate } from '../labels.js'

function Row({ search, onOpen, onRerun, onName, onDelete }) {
  const saved = Boolean(search.name)
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onOpen(search)} className="text-left text-[13px] font-medium hover:underline">
          {search.name || describeSearch(search.params) || 'Search'}
        </button>
        <p className="text-[12px] text-muted">
          {saved && `${describeSearch(search.params)} · `}
          {formatDate(search.created_at)} · {search.results_count} {search.results_count === 1 ? 'job' : 'jobs'} found
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onRerun(search)} className="rounded-md px-2 py-1 text-[12px] text-muted hover:bg-hover hover:text-ink">Search again</button>
        <button
          type="button"
          onClick={() => onName(search)}
          aria-pressed={saved}
          aria-label={saved ? 'Unsave search' : 'Save search'}
          title={saved ? 'Saved search' : 'Save search'}
          className={`grid size-7 place-items-center rounded-md hover:bg-hover ${saved ? 'text-ink' : 'text-muted'}`}
        >
          <FiStar fill={saved ? 'currentColor' : 'none'} className="text-[14px]" />
        </button>
        <button type="button" onClick={() => onDelete(search)} aria-label="Delete from history" className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-red-600">
          <FiTrash2 className="text-[13px]" />
        </button>
      </div>
    </li>
  )
}

// F. saved searches, then every past search with its date and how many jobs it found.
export default function SearchHistory({ searches, onShowDiscovered, ...actions }) {
  const saved = searches.filter((s) => s.name)
  const list = (items) => (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {items.map((s) => <Row key={s.id} search={s} {...actions} />)}
    </ul>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-[13px]">
        <span className="text-muted">Every job your searches have found is kept, newest first.</span>
        <button type="button" onClick={onShowDiscovered} className="font-medium underline-offset-4 hover:underline">Previously discovered jobs</button>
      </div>
      <section>
        <h3 className="mb-2 text-[13px] font-medium">Saved searches</h3>
        {saved.length ? list(saved) : <p className="text-[13px] text-muted">Star a search to keep it here.</p>}
      </section>
      <section>
        <h3 className="mb-2 text-[13px] font-medium">Recent searches</h3>
        {searches.length ? list(searches) : <p className="text-[13px] text-muted">Your searches will show here.</p>}
      </section>
    </div>
  )
}
