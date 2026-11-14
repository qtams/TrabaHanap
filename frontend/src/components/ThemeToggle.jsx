import { AnimatePresence, motion } from 'motion/react'
import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../hooks/useTheme.js'

// Sun/moon button: the new icon drops in from above, the old one falls out below.
export default function ThemeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="grid size-8 place-items-center overflow-hidden rounded-md text-muted hover:bg-hover hover:text-ink"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ y: -14, opacity: 0, rotate: -60 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 14, opacity: 0, rotate: 60 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="grid"
        >
          {dark ? <FiMoon className="text-[15px]" /> : <FiSun className="text-[15px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
