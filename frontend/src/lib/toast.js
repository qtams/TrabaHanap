import { cssTransition, toast } from 'react-toastify'

// Toasts use the same drop-in animation as pages (keyframes in index.css).
export const dropIn = cssTransition({ enter: 'drop-in', exit: 'drop-out' })

export { toast }
