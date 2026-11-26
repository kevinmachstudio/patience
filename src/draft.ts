import { useRef, useState } from 'react'

export function useDraft<T>(key: string, fallback: () => T) {
  const item = 'patience-draft:' + key
  const [draft, setDraft] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(item)
      if (raw !== null) return JSON.parse(raw) as T
    } catch {
      // Drafts remain usable when the browser blocks local storage.
    }
    return fallback()
  })
  const current = useRef(draft)

  function change(update: (previous: T) => T) {
    const value = update(current.current)
    current.current = value
    setDraft(value)
    try { localStorage.setItem(item, JSON.stringify(value)) } catch { /* Keep the in-memory draft. */ }
  }
  function clear() {
    try { localStorage.removeItem(item) } catch { /* The browser has no accessible draft store. */ }
  }
  return [draft, change, clear] as const
}

export function clearDrafts(profile: string) {
  const prefix = 'patience-draft:' + profile + ':'
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) localStorage.removeItem(key)
    }
  } catch {
    // The browser has no accessible draft store.
  }
}
