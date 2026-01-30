/**
 * SHERPA GLOBAL STATE STORE
 *
 * Centralized state management using Zustand.
 * Replaces the scattered useState calls and provides a single source of truth.
 *
 * Architecture:
 * - Slices for different domains (app, chat, wallet, ui)
 * - Persistence for user preferences
 * - DevTools integration for debugging
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import type { AgentMessage } from '../types/defi-ui'
import type { Widget } from '../types/widgets'
import type { EntitlementSnapshot } from '../types/entitlement'
import type { LLMProviderInfo } from '../types/llm'
import type { PortfolioSummaryViewModel } from '../workspace/types'

// ============================================
// TYPES
// ============================================

export type PersonaId = 'friendly' | 'technical' | 'professional' | 'educational'
export type ThemeId = 'dark' | 'light'
export type ChatDensity = 'comfortable' | 'compact'
export type Chain = 'ethereum' | 'solana' | 'polygon' | 'arbitrum' | 'optimism'
export type AuthStatus = 'idle' | 'signing' | 'signed_in' | 'error'

export interface WalletState {
  address: string | null
  chain: Chain
  isConnected: boolean
  isManual: boolean
}

export interface AuthSessionState {
  status: AuthStatus
  error: string | null
  session: {
    accessToken: string
    refreshToken: string
    expiresAt: string
    walletAddress: string
    chainId: number | 'solana'
  } | null
}

export interface ChatMessage extends AgentMessage {
  timestamp: number
}

export interface Conversation {
  id: string
  title?: string
  messages: ChatMessage[]
  createdAt: number
  lastActivity: number
}

export interface ModalState {
  simulate: { from?: string; to?: string } | null
  swap: { from?: string; to?: string } | null
  bridge: boolean
  relay: boolean
  expandedPanel: string | null
  proInfo: boolean
}

// ============================================
// APP SLICE - Core application state
// ============================================

interface AppSlice {
  // Theme
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  toggleTheme: () => void

  // Persona
  persona: PersonaId
  setPersona: (persona: PersonaId) => void

  // LLM Configuration
  llmModel: string
  llmProviders: LLMProviderInfo[]
  llmProvidersLoading: boolean
  setLlmModel: (model: string) => void
  setLlmProviders: (providers: LLMProviderInfo[], loading?: boolean) => void

  // Health
  healthStatus: 'checking' | 'healthy' | 'degraded' | 'offline'
  setHealthStatus: (status: AppSlice['healthStatus']) => void
}

// ============================================
// WALLET SLICE - Web3 wallet state
// ============================================

interface WalletSlice {
  wallet: WalletState
  entitlement: EntitlementSnapshot
  proOverride: boolean
  auth: AuthSessionState

  // Actions
  setWallet: (wallet: Partial<WalletState>) => void
  clearWallet: () => void
  setAuth: (auth: Partial<AuthSessionState>) => void
  clearAuth: () => void
  setEntitlement: (entitlement: EntitlementSnapshot) => void
  setProOverride: (override: boolean) => void

  // Computed
  isPro: () => boolean
  isGatingActive: () => boolean
}

// ============================================
// CHAT SLICE - Conversation and messages
// ============================================

interface ChatSlice {
  // Current conversation
  conversationId: string | null
  messages: ChatMessage[]
  isTyping: boolean
  inputValue: string

  // Actions
  setConversationId: (id: string | null) => void
  addMessage: (message: Omit<ChatMessage, 'timestamp'>) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  removeMessage: (id: string) => void
  clearMessages: () => void
  setIsTyping: (typing: boolean) => void
  setInputValue: (value: string) => void

  // Conversation management
  startNewChat: () => void
}

// ============================================
// WORKSPACE SLICE - Panels and widgets (Widget Panel)
// ============================================

interface WorkspaceSlice {
  // Visibility
  isVisible: boolean
  toggleVisibility: () => void
  show: () => void
  hide: () => void

  // Widgets
  widgets: Widget[]
  highlightedWidgets: string[]
  collapsedPanels: Record<string, boolean>

  // Widget Panel Tabs
  widgetTabs: string[]          // Widget IDs in tab order
  activeWidgetId: string | null // Currently visible tab
  panelWidth: number            // Resizable panel width

  // Widget Actions
  addWidget: (widget: Widget) => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  removeWidget: (id: string) => void
  setWidgets: (widgets: Widget[]) => void
  reorderWidgets: (activeId: string, overId: string) => void
  setHighlightedWidgets: (ids: string[]) => void
  clearHighlights: () => void
  togglePanelCollapse: (id: string) => void
  setPanelCollapsed: (id: string, collapsed: boolean) => void

  // Widget Panel Tab Actions
  setActiveWidget: (id: string | null) => void
  openWidgetTab: (widgetId: string) => void
  closeWidgetTab: (widgetId: string) => void
  reorderWidgetTabs: (fromIndex: number, toIndex: number) => void
  setPanelWidth: (width: number) => void

  // Portfolio
  portfolioSummary: PortfolioSummaryViewModel | null
  portfolioStatus: 'idle' | 'loading' | 'success' | 'error'
  portfolioError: string | null
  setPortfolio: (summary: PortfolioSummaryViewModel | null, status?: WorkspaceSlice['portfolioStatus'], error?: string | null) => void
}

// ============================================
// CONVERSATION SIDEBAR SLICE - History sidebar state
// ============================================

interface ConversationSidebarSlice {
  // Visibility
  sidebarVisible: boolean
  toggleSidebar: () => void
  showSidebar: () => void
  hideSidebar: () => void

  // Search
  sidebarSearchQuery: string
  setSidebarSearchQuery: (query: string) => void

  // Mobile drawer
  mobileDrawerOpen: boolean
  setMobileDrawerOpen: (open: boolean) => void
}

// ============================================
// SETTINGS SLICE - User preferences
// ============================================

interface SettingsSlice {
  streamingEnabled: boolean
  chatDensity: ChatDensity
  txNotifications: boolean
  setStreamingEnabled: (enabled: boolean) => void
  setChatDensity: (density: ChatDensity) => void
  setTxNotifications: (enabled: boolean) => void
}

// ============================================
// UI SLICE - Modals and UI state
// ============================================

interface UISlice {
  modals: ModalState
  ariaAnnouncement: string
  coachMarkDismissed: boolean
  hasNudgedWorkspace: boolean

  // Modal actions
  openModal: <K extends keyof ModalState>(modal: K, value: ModalState[K]) => void
  closeModal: (modal: keyof ModalState) => void
  closeAllModals: () => void

  // UI actions
  setAriaAnnouncement: (announcement: string) => void
  dismissCoachMark: () => void
  setNudgedWorkspace: (nudged: boolean) => void
}

// ============================================
// COMBINED STORE TYPE
// ============================================

export type SherpaStore = AppSlice & WalletSlice & ChatSlice & WorkspaceSlice & ConversationSidebarSlice & SettingsSlice & UISlice

// ============================================
// INITIAL STATES
// ============================================

const initialWallet: WalletState = {
  address: null,
  chain: 'ethereum',
  isConnected: false,
  isManual: false,
}

const initialEntitlement: EntitlementSnapshot = {
  status: 'idle',
  pro: false,
  chain: null,
}

const initialAuth: AuthSessionState = {
  status: 'idle',
  error: null,
  session: null,
}

const initialModals: ModalState = {
  simulate: null,
  swap: null,
  bridge: false,
  relay: false,
  expandedPanel: null,
  proInfo: false,
}

const seedMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Hey! I can analyze tokens, protocols, and your portfolio. What do you want to look at today?',
    timestamp: Date.now(),
    actions: [
      { id: 'a1', label: 'Show my portfolio', type: 'show_panel', params: { panel_id: 'portfolio_overview' } },
      { id: 'a2', label: 'Top coins today', type: 'show_panel', params: { panel_id: 'top_coins' } },
      { id: 'a3', label: 'Trending tokens', type: 'show_panel', params: { panel_id: 'trending_tokens' } },
    ],
  },
]

const seedWidgets: Widget[] = [
  {
    id: 'token_price_chart',
    kind: 'chart',
    title: 'Token price chart',
    payload: { coin_id: 'ethereum', symbol: 'ETH' },
    sources: [{ label: 'CoinGecko', href: 'https://www.coingecko.com' }],
    density: 'full',
  },
]

// ============================================
// STORE CREATION
// ============================================

export const useSherpaStore = create<SherpaStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // ============================================
          // APP SLICE
          // ============================================
          theme: 'dark' as ThemeId,
          persona: 'friendly' as PersonaId,
          llmModel: 'claude-sonnet-4-20250514',
          llmProviders: [],
          llmProvidersLoading: true,
          healthStatus: 'checking' as const,

          setTheme: (theme) => set({ theme }),

          toggleTheme: () =>
            set((state) => ({
              theme: state.theme === 'dark' ? 'light' : 'dark',
            })),

          setPersona: (persona) => set({ persona }),

          setLlmModel: (model) => set({ llmModel: model }),

          setLlmProviders: (providers, loading = false) =>
            set({
              llmProviders: providers,
              llmProvidersLoading: loading,
            }),

          setHealthStatus: (status) => set({ healthStatus: status }),

          // ============================================
          // WALLET SLICE
          // ============================================
          wallet: initialWallet,
          entitlement: initialEntitlement,
          proOverride: false,
          auth: initialAuth,

          setWallet: (walletUpdate) =>
            set((state) => ({
              wallet: { ...state.wallet, ...walletUpdate },
            })),

          clearWallet: () =>
            set({
              wallet: initialWallet,
              entitlement: initialEntitlement,
              proOverride: false,
            }),

          setAuth: (authUpdate) =>
            set((state) => ({
              auth: { ...state.auth, ...authUpdate },
            })),

          clearAuth: () => set({ auth: initialAuth }),

          setEntitlement: (entitlement) => set({ entitlement }),

          setProOverride: (override) => set({ proOverride: override }),

          isPro: () => {
            const { entitlement, proOverride } = get()
            const gatingActive = entitlement.status === 'ready' && entitlement.gating === 'token'
            return entitlement.pro || (!gatingActive && proOverride)
          },

          isGatingActive: () => {
            const { entitlement } = get()
            return entitlement.status === 'ready' && entitlement.gating === 'token'
          },

          // ============================================
          // CHAT SLICE
          // ============================================
          conversationId: null,
          messages: seedMessages,
          isTyping: false,
          inputValue: '',

          setConversationId: (id) => set({ conversationId: id }),

          addMessage: (message) =>
            set((state) => ({
              messages: [
                ...state.messages,
                { ...message, timestamp: Date.now() },
              ],
            })),

          updateMessage: (id, updates) =>
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === id ? { ...m, ...updates } : m
              ),
            })),

          removeMessage: (id) =>
            set((state) => ({
              messages: state.messages.filter((m) => m.id !== id),
            })),

          clearMessages: () => set({ messages: [] }),

          setIsTyping: (typing) => set({ isTyping: typing }),

          setInputValue: (value) => set({ inputValue: value }),

          startNewChat: () =>
            set({
              conversationId: null,
              messages: seedMessages,
              inputValue: '',
              isTyping: false,
            }),

          // ============================================
          // WORKSPACE SLICE (Widget Panel)
          // ============================================
          isVisible: false,
          widgets: seedWidgets,
          highlightedWidgets: [],
          collapsedPanels: {},
          widgetTabs: [],
          activeWidgetId: null,
          panelWidth: 500,
          portfolioSummary: null,
          portfolioStatus: 'idle',
          portfolioError: null,

          toggleVisibility: () =>
            set((state) => ({ isVisible: !state.isVisible })),

          show: () => set({ isVisible: true }),

          hide: () => set({ isVisible: false }),

          addWidget: (widget) =>
            set((state) => {
              const existingIndex = state.widgets.findIndex((w) => w.id === widget.id)
              // Always ensure widget is in widget tabs
              const newTabs = state.widgetTabs.includes(widget.id)
                ? state.widgetTabs
                : [...state.widgetTabs, widget.id]

              if (existingIndex !== -1) {
                // Widget exists - update it and ensure it's in tabs
                // Preserve visibility state - don't force panel open on data refresh
                const newWidgets = [...state.widgets]
                newWidgets[existingIndex] = widget
                return {
                  widgets: newWidgets,
                  widgetTabs: newTabs,
                  activeWidgetId: state.activeWidgetId ?? widget.id,
                }
              }
              // New widget - add to widgets and tabs
              return {
                widgets: [widget, ...state.widgets],
                widgetTabs: newTabs,
                activeWidgetId: widget.id,
                isVisible: true, // Auto-show panel when NEW widget added
              }
            }),

          updateWidget: (id, updates) =>
            set((state) => ({
              widgets: state.widgets.map((w) =>
                w.id === id ? { ...w, ...updates } : w
              ),
            })),

          removeWidget: (id) =>
            set((state) => {
              // Only update state if widget exists to prevent infinite loops
              const widgetExists = state.widgets.some((w) => w.id === id)
              const tabExists = state.widgetTabs.includes(id)
              if (!widgetExists && !tabExists) {
                return state
              }
              const newTabs = state.widgetTabs.filter((tabId) => tabId !== id)
              const newActiveId = state.activeWidgetId === id
                ? newTabs[0] ?? null
                : state.activeWidgetId
              return {
                widgets: state.widgets.filter((w) => w.id !== id),
                widgetTabs: newTabs,
                activeWidgetId: newActiveId,
              }
            }),

          setWidgets: (widgets) => set({ widgets }),

          reorderWidgets: (activeId, overId) =>
            set((state) => {
              const oldIndex = state.widgets.findIndex((w) => w.id === activeId)
              const newIndex = state.widgets.findIndex((w) => w.id === overId)
              if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                return state
              }
              const newWidgets = [...state.widgets]
              const [item] = newWidgets.splice(oldIndex, 1)
              newWidgets.splice(newIndex, 0, item)
              return { widgets: newWidgets }
            }),

          setHighlightedWidgets: (ids) => set({ highlightedWidgets: ids }),

          clearHighlights: () => set({ highlightedWidgets: [] }),

          togglePanelCollapse: (id) =>
            set((state) => ({
              collapsedPanels: {
                ...state.collapsedPanels,
                [id]: !state.collapsedPanels[id],
              },
            })),

          setPanelCollapsed: (id, collapsed) =>
            set((state) => ({
              collapsedPanels: {
                ...state.collapsedPanels,
                [id]: collapsed,
              },
            })),

          // Widget Panel Tab Actions
          setActiveWidget: (id) => set({ activeWidgetId: id }),

          openWidgetTab: (widgetId) =>
            set((state) => {
              // If already in tabs, just activate it
              if (state.widgetTabs.includes(widgetId)) {
                return { activeWidgetId: widgetId, isVisible: true }
              }
              // Add to tabs and activate
              return {
                widgetTabs: [...state.widgetTabs, widgetId],
                activeWidgetId: widgetId,
                isVisible: true,
              }
            }),

          closeWidgetTab: (widgetId) =>
            set((state) => {
              const newTabs = state.widgetTabs.filter((id) => id !== widgetId)
              const currentIndex = state.widgetTabs.indexOf(widgetId)
              // If closing active tab, activate the previous tab or next
              let newActiveId = state.activeWidgetId
              if (state.activeWidgetId === widgetId) {
                newActiveId = newTabs[Math.min(currentIndex, newTabs.length - 1)] ?? null
              }
              return {
                widgetTabs: newTabs,
                activeWidgetId: newActiveId,
                // Hide panel if no more tabs
                isVisible: newTabs.length > 0 ? state.isVisible : false,
              }
            }),

          reorderWidgetTabs: (fromIndex, toIndex) =>
            set((state) => {
              if (fromIndex === toIndex) return state
              const newTabs = [...state.widgetTabs]
              const [item] = newTabs.splice(fromIndex, 1)
              newTabs.splice(toIndex, 0, item)
              return { widgetTabs: newTabs }
            }),

          setPanelWidth: (width) => set({ panelWidth: width }),

          setPortfolio: (summary, status = 'success', error = null) =>
            set({
              portfolioSummary: summary,
              portfolioStatus: status,
              portfolioError: error,
            }),

          // ============================================
          // CONVERSATION SIDEBAR SLICE
          // ============================================
          sidebarVisible: false,
          sidebarSearchQuery: '',
          mobileDrawerOpen: false,

          toggleSidebar: () =>
            set((state) => ({ sidebarVisible: !state.sidebarVisible })),

          showSidebar: () => set({ sidebarVisible: true }),

          hideSidebar: () => set({ sidebarVisible: false }),

          setSidebarSearchQuery: (query) => set({ sidebarSearchQuery: query }),

          setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),

          // ============================================
          // SETTINGS SLICE
          // ============================================
          streamingEnabled: false,
          chatDensity: 'comfortable',
          txNotifications: true,

          setStreamingEnabled: (enabled) => set({ streamingEnabled: enabled }),

          setChatDensity: (density) => set({ chatDensity: density }),

          setTxNotifications: (enabled) => set({ txNotifications: enabled }),

          // ============================================
          // UI SLICE
          // ============================================
          modals: initialModals,
          ariaAnnouncement: '',
          coachMarkDismissed: false,
          hasNudgedWorkspace: false,

          openModal: (modal, value) =>
            set((state) => ({
              modals: { ...state.modals, [modal]: value },
            })),

          closeModal: (modal) =>
            set((state) => {
              const currentValue = state.modals[modal]
              return {
                modals: {
                  ...state.modals,
                  [modal]: typeof currentValue === 'boolean' ? false : null,
                },
              }
            }),

          closeAllModals: () => set({ modals: initialModals }),

          setAriaAnnouncement: (announcement) =>
            set({ ariaAnnouncement: announcement }),

          dismissCoachMark: () => set({ coachMarkDismissed: true }),

          setNudgedWorkspace: (nudged) => set({ hasNudgedWorkspace: nudged }),
        }),
        {
          name: 'sherpa-store',
          // Only persist user preferences, not runtime state
          partialize: (state) => ({
            theme: state.theme,
            persona: state.persona,
            llmModel: state.llmModel,
            coachMarkDismissed: state.coachMarkDismissed,
            hasNudgedWorkspace: state.hasNudgedWorkspace,
            collapsedPanels: state.collapsedPanels,
            // Widget panel persistence
            widgetTabs: state.widgetTabs,
            activeWidgetId: state.activeWidgetId,
            panelWidth: state.panelWidth,
            // Conversation sidebar persistence
            sidebarVisible: state.sidebarVisible,
            // Settings persistence
            streamingEnabled: state.streamingEnabled,
            chatDensity: state.chatDensity,
            txNotifications: state.txNotifications,
          }),
        }
      )
    ),
    { name: 'SherpaStore' }
  )
)

// ============================================
// SELECTORS - Memoized selectors for common patterns
// ============================================

export const selectTheme = (state: SherpaStore) => state.theme
export const selectPersona = (state: SherpaStore) => state.persona
export const selectWallet = (state: SherpaStore) => state.wallet
export const selectIsConnected = (state: SherpaStore) => state.wallet.isConnected
export const selectAuth = (state: SherpaStore) => state.auth
export const selectMessages = (state: SherpaStore) => state.messages
export const selectWidgets = (state: SherpaStore) => state.widgets
export const selectWorkspaceVisible = (state: SherpaStore) => state.isVisible
export const selectModals = (state: SherpaStore) => state.modals

// Widget panel selectors
export const selectWidgetTabs = (state: SherpaStore) => state.widgetTabs
export const selectActiveWidgetId = (state: SherpaStore) => state.activeWidgetId
export const selectPanelWidth = (state: SherpaStore) => state.panelWidth

export const selectActiveWidget = (state: SherpaStore) =>
  state.widgets.find((w) => w.id === state.activeWidgetId) ?? null

export const selectPanelWidgets = (state: SherpaStore) =>
  state.widgetTabs
    .map((id) => state.widgets.find((w) => w.id === id))
    .filter((w): w is Widget => w !== undefined)

// Complex selectors
export const selectVisibleWidgets = (state: SherpaStore) =>
  state.widgets.filter((w) => !state.collapsedPanels[w.id])

export const selectProStatus = (state: SherpaStore) => ({
  isPro: state.isPro(),
  isGatingActive: state.isGatingActive(),
  entitlement: state.entitlement,
  proOverride: state.proOverride,
})

// ============================================
// HOOKS - Convenience hooks for specific domains
// ============================================

export const useTheme = () => useSherpaStore((state) => ({
  theme: state.theme,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
}))

export const usePersona = () => useSherpaStore((state) => ({
  persona: state.persona,
  setPersona: state.setPersona,
}))

export const useWallet = () => useSherpaStore((state) => ({
  wallet: state.wallet,
  setWallet: state.setWallet,
  clearWallet: state.clearWallet,
  isPro: state.isPro,
  entitlement: state.entitlement,
}))

export const useAuth = () => useSherpaStore((state) => ({
  auth: state.auth,
  setAuth: state.setAuth,
  clearAuth: state.clearAuth,
}))

export const useChat = () => useSherpaStore((state) => ({
  conversationId: state.conversationId,
  messages: state.messages,
  isTyping: state.isTyping,
  inputValue: state.inputValue,
  addMessage: state.addMessage,
  updateMessage: state.updateMessage,
  removeMessage: state.removeMessage,
  setIsTyping: state.setIsTyping,
  setInputValue: state.setInputValue,
  startNewChat: state.startNewChat,
}))

export const useWorkspace = () => useSherpaStore((state) => ({
  isVisible: state.isVisible,
  widgets: state.widgets,
  highlightedWidgets: state.highlightedWidgets,
  collapsedPanels: state.collapsedPanels,
  toggleVisibility: state.toggleVisibility,
  show: state.show,
  hide: state.hide,
  addWidget: state.addWidget,
  removeWidget: state.removeWidget,
  setHighlightedWidgets: state.setHighlightedWidgets,
  togglePanelCollapse: state.togglePanelCollapse,
}))

export const useModals = () => useSherpaStore((state) => ({
  modals: state.modals,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
}))

export const useWidgetPanel = () => useSherpaStore((state) => ({
  // State
  widgetTabs: state.widgetTabs,
  activeWidgetId: state.activeWidgetId,
  panelWidth: state.panelWidth,
  isVisible: state.isVisible,
  // Computed
  activeWidget: state.widgets.find((w) => w.id === state.activeWidgetId) ?? null,
  panelWidgets: state.widgetTabs
    .map((id) => state.widgets.find((w) => w.id === id))
    .filter((w): w is Widget => w !== undefined),
  // Actions
  setActiveWidget: state.setActiveWidget,
  openWidgetTab: state.openWidgetTab,
  closeWidgetTab: state.closeWidgetTab,
  reorderWidgetTabs: state.reorderWidgetTabs,
  setPanelWidth: state.setPanelWidth,
  toggleVisibility: state.toggleVisibility,
  show: state.show,
  hide: state.hide,
}))

export const useConversationSidebar = () => useSherpaStore((state) => ({
  // State
  isVisible: state.sidebarVisible,
  searchQuery: state.sidebarSearchQuery,
  mobileDrawerOpen: state.mobileDrawerOpen,
  // Actions
  toggleSidebar: state.toggleSidebar,
  showSidebar: state.showSidebar,
  hideSidebar: state.hideSidebar,
  setSidebarSearchQuery: state.setSidebarSearchQuery,
  setMobileDrawerOpen: state.setMobileDrawerOpen,
}))

export const useSettings = () => useSherpaStore((state) => ({
  streamingEnabled: state.streamingEnabled,
  chatDensity: state.chatDensity,
  txNotifications: state.txNotifications,
  setStreamingEnabled: state.setStreamingEnabled,
  setChatDensity: state.setChatDensity,
  setTxNotifications: state.setTxNotifications,
}))
