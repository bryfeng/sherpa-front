const PANEL_UI_KEY = 'sherpa.panelUI'

export interface PanelUIState {
  collapsed?: boolean
}

export function loadPanelUIState(): Record<string, PanelUIState> {
  try {
    const stored = localStorage.getItem(PANEL_UI_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Record<string, PanelUIState>
  } catch {
    return {}
  }
}

export function savePanelUIState(state: Record<string, PanelUIState>): void {
  try {
    localStorage.setItem(PANEL_UI_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function debouncedSavePanelUI(state: Record<string, PanelUIState>, delay = 300): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    savePanelUIState(state)
    saveTimeout = null
  }, delay)
}
