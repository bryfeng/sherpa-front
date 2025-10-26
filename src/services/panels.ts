import type { Panel, PanelSource } from '../types/defi-ui'

// Normalize various backend panel payload shapes into UI Panel[]
export function transformBackendPanels(input: any): Panel[] {
  if (!input) return []

  // If already array-ish
  if (Array.isArray(input)) {
    return input
      .map(normalizeItem)
      .filter(Boolean) as Panel[]
  }

  // If object map: id -> panel data
  if (typeof input === 'object') {
    return Object.entries(input)
      .map(([id, value]) => normalizeItem({ id, ...(value as any) }))
      .filter(Boolean) as Panel[]
  }

  return []
}

function normalizeItem(item: any): Panel | null {
  if (!item) return null
  const id = String(item.id || item.panel_id || Math.random().toString(36).slice(2))
  const kind = (item.kind || item.type || 'card') as Panel['kind']
  const title = String(item.title || item.name || id)
  const payload = item.payload ?? item.data ?? item.content ?? {}
  const metadata = item.metadata ?? item.meta ?? {}
  const sources = normalizeSources(item)
  if (!id || !title) return null
  const panel: Panel = { id, kind, title, payload }
  if (sources.length) panel.sources = sources
  if (metadata && Object.keys(metadata).length > 0) panel.metadata = metadata
  return panel
}

function normalizeSources(item: any): PanelSource[] {
  const raw = item?.sources ?? item?.source ?? item?.payload?.sources
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr
    .map((entry) => {
      if (!entry) return null
      if (typeof entry === 'string') {
        if (entry.startsWith('http')) {
          try {
            const hostname = new URL(entry).hostname.replace(/^www\./, '')
            return { name: hostname, url: entry }
          } catch {
            return { name: entry }
          }
        }
        return { name: entry }
      }
      if (typeof entry === 'object') {
        return entry as PanelSource
      }
      return null
    })
    .filter(Boolean) as PanelSource[]
}
