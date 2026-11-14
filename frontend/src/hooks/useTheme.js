import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const KEY = 'theme'
const media = () => matchMedia('(prefers-color-scheme: dark)')

function apply(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

function save(dark) {
  try {
    // Picking the same theme as the browser clears the override, so it follows the browser again.
    if (dark === media().matches) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, dark ? 'dark' : 'light')
  } catch {
    // storage blocked: the choice just lasts for this visit
  }
}

function hasSavedChoice() {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

// Light/dark theme. Starts from index.html's pick (saved choice, else the browser setting)
// and keeps following the browser until the user chooses otherwise.
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const mq = media()
    const onChange = (e) => {
      if (hasSavedChoice()) return
      apply(e.matches)
      setDark(e.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Pass the click event to grow the new theme out of the button as a circle.
  function toggle(event) {
    const next = !dark
    const commit = () => {
      apply(next)
      setDark(next)
      save(next)
    }

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduced || !event) return commit()

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    document.startViewTransition(() => flushSync(commit)).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  return { dark, toggle }
}
