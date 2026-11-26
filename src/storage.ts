import { actions, glyphs, metrics, type Data } from './model'

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('patience', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('profiles')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function load(key: string): Promise<Data | undefined> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('profiles').objectStore('profiles').get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

let pending = Promise.resolve()
export function save(key: string, data: Data) {
  const operation = pending.catch(() => {}).then(async () => {
    const db = await database()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('profiles', 'readwrite')
        transaction.objectStore('profiles').put(data, key)
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
        transaction.onerror = () => reject(transaction.error)
      })
    } finally {
      db.close()
    }
  })
  pending = operation
  return operation
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const string = (value: unknown): value is string => typeof value === 'string'
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const date = (value: unknown): value is string => string(value) && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value
const between = (value: unknown, min: number, max: number) => number(value) && Number.isInteger(value) && value >= min && value <= max
const unique = (values: unknown[]) => new Set(values).size === values.length

export function backup(raw: string): Data {
  const value: unknown = JSON.parse(raw)
  if (!record(value) || value.version !== 1 || !['system', 'light', 'dark'].includes(String(value.theme))
    || !Array.isArray(value.categories) || !Array.isArray(value.entries) || !Array.isArray(value.pauses)
    || !Array.isArray(value.rest) || !Array.isArray(value.awards)
    || !value.rest.every(date) || !unique(value.rest) || !value.awards.every(string)
    || !value.categories.every(c => record(c) && [c.id, c.name, c.goal, c.origin, c.next].every(string)
      && typeof c.archived === 'boolean' && string(c.icon) && glyphs.includes(c.icon)
      && string(c.color) && /^#[a-f\d]{6}$/i.test(c.color) && date(c.start) && date(c.targetDate) && c.targetDate >= c.start
      && metrics.some(metric => metric === c.metric) && [c.baseline, c.current, c.target].every(number)
      && Array.isArray(c.milestones) && c.milestones.every(m => record(m) && string(m.id) && string(m.text)
        && (m.date === '' || date(m.date)) && (m.done === '' || date(m.done)))
      && unique(c.milestones.map(m => m.id))
      && Array.isArray(c.history) && c.history.every(h => record(h) && date(h.date) && number(h.value)))
    || !unique(value.categories.map(c => c.id))) throw new Error('This file is not a valid Patience backup.')
  const categories = new Set(value.categories.map(c => c.id))
  if (!value.entries.every(e => record(e) && string(e.id) && categories.has(e.category) && date(e.date)
    && between(e.outcome, 0, 2) && between(e.mood, 0, 4) && Array.isArray(e.actions)
    && e.actions.every(a => actions.some(action => action === a)) && unique(e.actions)
    && string(e.note) && string(e.accomplishment) && (e.value === undefined || number(e.value)))
    || !unique(value.entries.map(e => e.id)) || !unique(value.entries.map(e => JSON.stringify([e.category, e.date])))
    || !value.pauses.every(p => record(p) && string(p.id) && number(p.created) && number(p.until) && p.until >= p.created
      && Array.isArray(p.answers) && p.answers.length === 6 && p.answers.every(string) && (p.review === undefined || string(p.review)))
    || !unique(value.pauses.map(p => p.id))) throw new Error('This file contains invalid records.')
  return value as Data
}

export function download(filename: string, text: string, type: string) {
  const href = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 5000)
}

export function csv(rows: (string | number)[][]) {
  return rows.map(row => row.map(cell => {
    const value = String(cell)
    const protectedValue = typeof cell === 'string' && /^[\s]*[=+@-]/.test(value) ? "'" + value : value
    return '"' + protectedValue.replaceAll('"', '""') + '"'
  }).join(',')).join('\r\n')
}
