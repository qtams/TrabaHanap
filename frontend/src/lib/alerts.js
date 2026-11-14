import Swal from 'sweetalert2'

const BTN = 'rounded-md px-3.5 py-2 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink/20'

// SweetAlert2 restyled to match the app (palette colours, so it follows light/dark mode).
const classes = (tone) => ({
  popup: 'rounded-xl! border! border-line! bg-surface! p-6! shadow-lg!',
  title: 'text-base! font-semibold! text-ink! p-0!',
  htmlContainer: 'text-[13px]! text-muted! m-0! mt-2!',
  actions: 'gap-2! mt-6! justify-end! w-full!',
  confirmButton: `${BTN} ${tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-ink text-on-ink hover:opacity-85'}`,
  cancelButton: `${BTN} border border-line text-ink hover:bg-hover`,
})

// Ask before doing something. Resolves true when confirmed.
// tone: 'default' (black button) or 'danger' (red button, for deletes).
export async function confirm({ title, text, confirmText = 'Confirm', tone = 'default' }) {
  const result = await Swal.fire({
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    reverseButtons: true,
    focusCancel: tone === 'danger',
    buttonsStyling: false,
    customClass: classes(tone),
  })
  return result.isConfirmed
}

// Ask for one line of text. Resolves the trimmed text, or null when cancelled or empty.
export async function promptText({ title, label, value = '', confirmText = 'Save', maxLength = 80 }) {
  const result = await Swal.fire({
    title,
    input: 'text',
    inputValue: value,
    inputAttributes: { maxlength: maxLength, 'aria-label': label },
    showCancelButton: true,
    confirmButtonText: confirmText,
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      ...classes('default'),
      input: 'w-full! m-0! mt-4! rounded-md! border! border-line! bg-surface! px-3! py-2! text-[13px]! text-ink! shadow-none! outline-none! focus:border-subtle!',
    },
  })
  return result.isConfirmed ? result.value?.trim() || null : null
}

export { Swal }
