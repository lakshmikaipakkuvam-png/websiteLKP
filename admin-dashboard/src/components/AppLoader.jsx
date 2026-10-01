import { useEffect, useState } from 'react'

const MIN_VISIBLE_MS = 550

export default function AppLoader({ active, label = 'Loading' }) {
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    let timeoutId

    if (active) {
      setVisible(true)
      return undefined
    }

    timeoutId = window.setTimeout(() => setVisible(false), MIN_VISIBLE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [active])

  if (!visible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-lifted/45 backdrop-blur-sm" role="status" aria-label={label}>
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-3 w-3 animate-bounce rounded-full bg-signal"
            style={{ animationDelay: `${index * 140}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
