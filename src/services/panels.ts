import type { Panel } from '../pages/DeFiChatAdaptiveUI'

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
  if (!id || !title) return null
  return { id, kind, title, payload }
}

