// TODO: Workstream 7 — Analytics & Explainability (Minimal)

export type SherpaEvent = {
  name: string
  payload?: unknown
  ts: number
}

const STORAGE_KEY = 'events'
const MAX_EVENTS = 200

function safeParseEvents(raw: string | null): SherpaEvent[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as SherpaEvent[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.name === 'string' && typeof item.ts === 'number')
  } catch {
    return []
  }
}

export function emit(event: { name: string; payload?: unknown; ts?: number }) {
  const record: SherpaEvent = {
    name: event.name,
    payload: event.payload,
    ts: typeof event.ts === 'number' ? event.ts : Date.now(),
  }

  console.debug('[evt]', record)

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return record
  }

  try {
    const existing = safeParseEvents(window.localStorage.getItem(STORAGE_KEY))
    existing.push(record)
    const trimmed = existing.length > MAX_EVENTS ? existing.slice(existing.length - MAX_EVENTS) : existing
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage failures silently to avoid breaking UX
  }

  return record
}

export function readEvents(): SherpaEvent[] {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return []
  try {
    return safeParseEvents(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}
