import { useRef } from 'react'
import DatePicker from 'react-datepicker'
import { FiCalendar, FiX } from 'react-icons/fi'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "Jan 2022", "January 2022", "2022-01", "2019" → a Date (first of the month); anything else → null.
function parseMonth(value) {
  const s = (value ?? '').trim()
  const named = s.match(/([A-Za-z]{3,})\.?,?\s+(\d{4})/)
  if (named) {
    const m = MONTHS.findIndex((x) => named[1].toLowerCase().startsWith(x.toLowerCase()))
    if (m >= 0) return new Date(Number(named[2]), m, 1)
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, 1)
  const year = s.match(/\b(19|20)\d{2}\b/)
  return year ? new Date(Number(year[0]), 0, 1) : null
}

const TODAY = new Date() // latest selectable month; fine to fix at page load
const formatMonth = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`

// Looks like the other inputs; shows the stored text as is ("Present", "Expected 2026"…).
function Trigger({ text, placeholder, onClick, onClear, ref }) {
  return (
    <div className="relative">
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-[13px] outline-none hover:border-subtle focus:border-subtle"
      >
        <FiCalendar className="shrink-0 text-subtle" />
        <span className={`truncate ${text ? '' : 'text-subtle'}`}>{text || placeholder}</span>
      </button>
      {text && (
        <button type="button" onClick={onClear} aria-label="Clear date" className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-ink">
          <FiX className="text-[13px]" />
        </button>
      )}
    </div>
  )
}

/**
 * Month + year picker (react-datepicker) that stores text like "Jan 2022", the format resumes use.
 * present: adds a "Present" button, for end dates of current jobs. min: earliest selectable (e.g. the start date).
 */
export default function MonthField({ value, onChange, placeholder = 'Select month', present = false, min, max = TODAY }) {
  const picker = useRef(null)
  const close = () => picker.current?.setOpen(false)

  return (
    <DatePicker
      ref={picker}
      selected={parseMonth(value)}
      onChange={(d) => onChange(d ? formatMonth(d) : '')}
      showMonthYearPicker
      minDate={parseMonth(min) ?? undefined}
      maxDate={max ?? undefined}
      popperPlacement="bottom-start"
      popperClassName="th-datepicker-popper"
      calendarClassName="th-datepicker"
      wrapperClassName="block w-full"
      customInput={<Trigger text={value} placeholder={placeholder} onClear={(e) => { e.stopPropagation(); onChange('') }} />}
    >
      {present && (
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={() => { onChange('Present'); close() }}
            className={`w-full rounded-md px-2 py-1.5 text-[13px] ${value === 'Present' ? 'bg-ink text-on-ink' : 'hover:bg-hover'}`}
          >
            Present (I still work here)
          </button>
        </div>
      )}
    </DatePicker>
  )
}
