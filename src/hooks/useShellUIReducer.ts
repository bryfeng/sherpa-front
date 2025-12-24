import type { Panel } from '../types/defi-ui'

export interface ShellUIState {
  workspaceVisible: boolean
  highlight?: string[]
  panelUI: Record<string, { collapsed?: boolean }>
  expandedPanelId: string | null
  showProInfo: boolean
  copiedToken: boolean
  showSim: { from?: string; to?: string } | null
  showSwap: { from?: string; to?: string } | null
  showBridge: boolean
  showRelay: boolean
  ariaAnnouncement: string
}

export const initialShellUIState: ShellUIState = {
  workspaceVisible: true,
  highlight: undefined,
  panelUI: {},
  expandedPanelId: null,
  showProInfo: false,
  copiedToken: false,
  showSim: null,
  showSwap: null,
  showBridge: false,
  showRelay: false,
  ariaAnnouncement: '',
}

export type ShellUIAction =
  | { type: 'toggleWorkspace' }
  | { type: 'setWorkspaceVisible'; visible: boolean }
  | { type: 'setHighlight'; highlight?: string[] }
  | { type: 'togglePanelCollapse'; panelId: string }
  | { type: 'setPanelCollapsed'; panelId: string; collapsed: boolean }
  | { type: 'resetPanelUI' }
  | { type: 'setExpandedPanel'; panelId: string | null }
  | { type: 'setShowProInfo'; value: boolean }
  | { type: 'setCopiedToken'; value: boolean }
  | { type: 'setShowSim'; value: { from?: string; to?: string } | null }
  | { type: 'setShowSwap'; value: { from?: string; to?: string } | null }
  | { type: 'setShowBridge'; value: boolean }
  | { type: 'setShowRelay'; value: boolean }
  | { type: 'setAriaAnnouncement'; value: string }
  | { type: 'mergePanelUI'; value: Record<string, { collapsed?: boolean }> }

export function shellUIReducer(state: ShellUIState, action: ShellUIAction): ShellUIState {
  switch (action.type) {
    case 'toggleWorkspace':
      return { ...state, workspaceVisible: !state.workspaceVisible }
    case 'setWorkspaceVisible':
      return { ...state, workspaceVisible: action.visible }
    case 'setHighlight':
      return { ...state, highlight: action.highlight }
    case 'togglePanelCollapse': {
      const current = state.panelUI[action.panelId]?.collapsed
      return {
        ...state,
        panelUI: {
          ...state.panelUI,
          [action.panelId]: { ...state.panelUI[action.panelId], collapsed: !current },
        },
      }
    }
    case 'setPanelCollapsed':
      return {
        ...state,
        panelUI: {
          ...state.panelUI,
          [action.panelId]: { ...state.panelUI[action.panelId], collapsed: action.collapsed },
        },
      }
    case 'mergePanelUI':
      return { ...state, panelUI: { ...state.panelUI, ...action.value } }
    case 'resetPanelUI':
      return { ...state, panelUI: {} }
    case 'setExpandedPanel':
      return { ...state, expandedPanelId: action.panelId }
    case 'setShowProInfo':
      return { ...state, showProInfo: action.value }
    case 'setCopiedToken':
      return { ...state, copiedToken: action.value }
    case 'setShowSim':
      return { ...state, showSim: action.value }
    case 'setShowSwap':
      return { ...state, showSwap: action.value }
    case 'setShowBridge':
      return { ...state, showBridge: action.value }
    case 'setShowRelay':
      return { ...state, showRelay: action.value }
    case 'setAriaAnnouncement':
      return { ...state, ariaAnnouncement: action.value }
    default:
      return state
  }
}

export function collapseAllPanels(panels: Panel[]): Record<string, { collapsed?: boolean }> {
  return panels.reduce<Record<string, { collapsed?: boolean }>>((acc, panel) => {
    acc[panel.id] = { collapsed: false }
    return acc
  }, {})
}
