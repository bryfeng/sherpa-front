/**
 * SHERPA WIDGET SYSTEM - Type Definitions
 *
 * A comprehensive widget system designed for DeFi portfolio workspaces.
 * User-centric design with flexible sizing, smart states, and intuitive interactions.
 */

// ============================================
// WIDGET CATEGORIES
// ============================================

/**
 * Widget categories organize widgets by their primary purpose.
 * This helps users understand what each widget does at a glance.
 */
export type WidgetCategory =
  | 'data'      // Display portfolio, balances, prices
  | 'chart'     // Visualizations, graphs, trends
  | 'action'    // Swap, bridge, trade, stake
  | 'insight'   // AI summaries, predictions, alerts
  | 'history'   // Transaction history, chat history
  | 'utility'   // Calculator, gas tracker, notes

/**
 * Widget kinds are specific widget types within each category.
 */
export type WidgetKind =
  // Data widgets
  | 'portfolio-summary'
  | 'token-balance'
  | 'price-ticker'
  | 'watchlist'
  | 'wallet-overview'
  // Chart widgets
  | 'price-chart'
  | 'portfolio-chart'
  | 'allocation-pie'
  | 'pnl-chart'
  | 'volume-chart'
  // Action widgets
  | 'swap'
  | 'bridge'
  | 'send'
  | 'stake'
  | 'perps-trade'
  // Insight widgets
  | 'ai-summary'
  | 'market-prediction'
  | 'risk-analysis'
  | 'opportunity-alert'
  | 'news-feed'
  // History widgets
  | 'transaction-history'
  | 'chat-history'
  | 'activity-log'
  // Utility widgets
  | 'gas-tracker'
  | 'calculator'
  | 'notes'
  | 'quick-links'
  // Policy widgets
  | 'risk-policy'
  | 'session-keys'
  | 'policy-status'

// ============================================
// WIDGET SIZING
// ============================================

/**
 * Widget sizes in a 12-column grid system.
 * Widgets can span multiple columns and rows.
 */
export interface WidgetSize {
  /** Columns (1-12 on desktop, responsive) */
  cols: 1 | 2 | 3 | 4 | 6 | 12
  /** Rows (1-4, each row is ~150px) */
  rows: 1 | 2 | 3 | 4
}

/**
 * Preset size configurations for common use cases.
 */
export type WidgetSizePreset =
  | 'compact'    // 3 cols, 1 row - small data display
  | 'standard'   // 4 cols, 2 rows - most widgets
  | 'wide'       // 6 cols, 2 rows - charts with context
  | 'tall'       // 4 cols, 3 rows - detailed lists
  | 'large'      // 6 cols, 3 rows - full charts
  | 'full'       // 12 cols, 2 rows - full-width panels

export const SIZE_PRESETS: Record<WidgetSizePreset, WidgetSize> = {
  compact: { cols: 3, rows: 1 },
  standard: { cols: 4, rows: 2 },
  wide: { cols: 6, rows: 2 },
  tall: { cols: 4, rows: 3 },
  large: { cols: 6, rows: 3 },
  full: { cols: 12, rows: 2 },
}

// ============================================
// WIDGET STATE
// ============================================

/**
 * Widget lifecycle states.
 */
export type WidgetLifecycleState =
  | 'loading'    // Initial data fetch
  | 'ready'      // Loaded and displaying data
  | 'refreshing' // Updating data in background
  | 'stale'      // Data is outdated (configurable threshold)
  | 'error'      // Failed to load/update

/**
 * Widget display states (user-controlled).
 */
export interface WidgetDisplayState {
  /** Widget is collapsed to header only */
  collapsed: boolean
  /** Widget is pinned to top of workspace */
  pinned: boolean
  /** Widget is highlighted (just added or updated) */
  highlighted: boolean
  /** Widget is being dragged */
  dragging: boolean
  /** Widget is in edit mode (if applicable) */
  editing: boolean
}

// ============================================
// WIDGET DATA REFRESH
// ============================================

/**
 * Data refresh configuration.
 */
export interface WidgetRefreshConfig {
  /** Auto-refresh enabled */
  enabled: boolean
  /** Refresh interval in seconds (0 = manual only) */
  intervalSeconds: number
  /** Threshold in seconds before data is considered stale */
  staleThresholdSeconds: number
  /** Last successful refresh timestamp */
  lastRefreshedAt: number | null
}

export const DEFAULT_REFRESH_CONFIG: WidgetRefreshConfig = {
  enabled: true,
  intervalSeconds: 60,
  staleThresholdSeconds: 300, // 5 minutes
  lastRefreshedAt: null,
}

// ============================================
// WIDGET CONFIGURATION
// ============================================

/**
 * Base widget configuration that all widgets share.
 */
export interface BaseWidgetConfig {
  /** Unique widget instance ID */
  id: string
  /** Widget type */
  kind: WidgetKind
  /** Display title (can be customized by user) */
  title: string
  /** Category for organization */
  category: WidgetCategory
  /** Size configuration */
  size: WidgetSize
  /** Position in grid (column, row) */
  position: { col: number; row: number }
  /** Display state */
  display: WidgetDisplayState
  /** Refresh configuration */
  refresh: WidgetRefreshConfig
  /** When this widget was created */
  createdAt: number
  /** Optional widget-specific settings */
  settings?: Record<string, unknown>
}

/**
 * Widget-specific payload types.
 */
export interface WidgetPayloads {
  // Data widgets
  'portfolio-summary': {
    totalValue: number
    change24h: number
    topHoldings: Array<{ symbol: string; value: number; percentage: number }>
  }
  'token-balance': {
    tokens: Array<{
      address: string
      symbol: string
      name: string
      balance: number
      valueUsd: number
      logo?: string
    }>
  }
  'price-ticker': {
    tokens: Array<{
      symbol: string
      price: number
      change24h: number
      logo?: string
    }>
  }
  'watchlist': {
    tokens: string[] // Token addresses to watch
  }
  'wallet-overview': {
    address: string
    totalValue: number
    chains: Array<{ chain: string; value: number }>
  }

  // Chart widgets
  'price-chart': {
    tokenAddress?: string
    symbol: string
    timeframe: '1H' | '24H' | '7D' | '30D' | '1Y' | 'ALL'
    data?: Array<{ timestamp: number; price: number }>
  }
  'portfolio-chart': {
    timeframe: '7D' | '30D' | '90D' | '1Y' | 'ALL'
    data?: Array<{ timestamp: number; value: number }>
  }
  'allocation-pie': {
    segments: Array<{ label: string; value: number; color: string }>
  }
  'pnl-chart': {
    timeframe: '7D' | '30D' | '90D' | '1Y' | 'ALL'
    data?: Array<{ timestamp: number; pnl: number; cumulative: number }>
  }
  'volume-chart': {
    tokenAddress?: string
    timeframe: '24H' | '7D' | '30D'
    data?: Array<{ timestamp: number; volume: number }>
  }

  // Action widgets
  'swap': {
    fromToken?: string
    toToken?: string
    amount?: string
  }
  'bridge': {
    fromChain?: string
    toChain?: string
    token?: string
    amount?: string
  }
  'send': {
    recipient?: string
    token?: string
    amount?: string
  }
  'stake': {
    protocol?: string
    token?: string
    amount?: string
  }
  'perps-trade': {
    market?: string
    side?: 'long' | 'short'
    leverage?: number
    amount?: string
  }

  // Insight widgets
  'ai-summary': {
    summary: string
    generatedAt: number
    topics: string[]
  }
  'market-prediction': {
    token: string
    prediction: 'bullish' | 'bearish' | 'neutral'
    confidence: number
    reasoning: string
    timeframe: string
  }
  'risk-analysis': {
    overallRisk: 'low' | 'medium' | 'high'
    factors: Array<{ name: string; level: 'low' | 'medium' | 'high'; description: string }>
  }
  'opportunity-alert': {
    alerts: Array<{
      type: 'yield' | 'price' | 'airdrop' | 'governance'
      title: string
      description: string
      urgency: 'low' | 'medium' | 'high'
    }>
  }
  'news-feed': {
    items: Array<{
      title: string
      source: string
      url: string
      timestamp: number
      sentiment?: 'positive' | 'negative' | 'neutral'
    }>
  }

  // History widgets
  'transaction-history': {
    transactions: Array<{
      hash: string
      type: 'send' | 'receive' | 'swap' | 'approve' | 'stake' | 'other'
      timestamp: number
      status: 'pending' | 'confirmed' | 'failed'
      value?: number
      description: string
    }>
  }
  'chat-history': {
    sessions: Array<{
      id: string
      preview: string
      timestamp: number
      messageCount: number
    }>
  }
  'activity-log': {
    activities: Array<{
      type: string
      description: string
      timestamp: number
    }>
  }

  // Utility widgets
  'gas-tracker': {
    network: string
    low: number
    average: number
    fast: number
    unit: string
  }
  'calculator': {
    mode: 'token' | 'gas' | 'impermanent-loss'
  }
  'notes': {
    content: string
  }
  'quick-links': {
    links: Array<{ name: string; url: string; icon?: string }>
  }

  // Policy widgets
  'risk-policy': {
    config: {
      maxPositionPercent: number
      maxPositionValueUsd: number
      maxDailyVolumeUsd: number
      maxDailyLossUsd: number
      maxSingleTxUsd: number
      requireApprovalAboveUsd: number
      maxSlippagePercent: number
      warnSlippagePercent: number
      maxGasPercent: number
      warnGasPercent: number
      minLiquidityUsd: number
      enabled: boolean
    } | null
    status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
    error?: string
  }
  'session-keys': {
    sessions: Array<{
      sessionId: string
      permissions: string[]
      maxValuePerTxUsd: number
      maxTotalValueUsd: number
      totalValueUsedUsd: number
      transactionCount: number
      maxTransactions?: number
      chainAllowlist: number[]
      status: 'active' | 'expired' | 'revoked' | 'exhausted'
      expiresAt: number
      createdAt: number
      lastUsedAt?: number
    }>
    status: 'idle' | 'loading' | 'ready' | 'error'
    error?: string
  }
  'policy-status': {
    operational: boolean
    emergencyStop: boolean
    inMaintenance: boolean
    message?: string
    allowedChains: number[]
    maxSingleTxUsd: number
  }
}

/**
 * Complete widget definition with typed payload.
 * Use Widget<K> when you know the specific kind for strong typing.
 * Use Widget (no generic) for collections and stores.
 */
export interface Widget<K extends WidgetKind = WidgetKind> extends BaseWidgetConfig {
  kind: K
  /** Widget data payload - use type guards for specific widget kinds */
  payload: WidgetPayload
  /** Lifecycle state */
  state: WidgetLifecycleState
  /** Error message if state is 'error' */
  error?: string
}

/**
 * Union type of all possible widget payloads.
 * Use this for flexibility in stores and generic widget handling.
 */
export type WidgetPayload = WidgetPayloads[keyof WidgetPayloads]

/**
 * Type guard to check if a widget has a specific kind and narrow its payload.
 */
export function isWidgetOfKind<K extends WidgetKind>(
  widget: Widget,
  kind: K
): widget is Widget<K> & { payload: WidgetPayloads[K] } {
  return widget.kind === kind
}

/**
 * Get typed payload from a widget of known kind.
 * Returns undefined if the widget is not of the expected kind.
 */
export function getTypedPayload<K extends WidgetKind>(
  widget: Widget,
  kind: K
): WidgetPayloads[K] | undefined {
  if (widget.kind === kind) {
    return widget.payload as WidgetPayloads[K]
  }
  return undefined
}

// ============================================
// WIDGET INTERACTIONS
// ============================================

/**
 * Actions that can be performed on a widget.
 */
export type WidgetAction =
  | 'refresh'
  | 'collapse'
  | 'expand'
  | 'pin'
  | 'unpin'
  | 'duplicate'
  | 'remove'
  | 'resize'
  | 'configure'
  | 'export'
  | 'share'

/**
 * Context menu item for widget actions.
 */
export interface WidgetContextMenuItem {
  action: WidgetAction
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
}

/**
 * Default context menu items for all widgets.
 */
export const DEFAULT_CONTEXT_MENU: WidgetContextMenuItem[] = [
  { action: 'refresh', label: 'Refresh', icon: 'refresh-cw', shortcut: 'R' },
  { action: 'pin', label: 'Pin to Top', icon: 'pin', shortcut: 'P' },
  { action: 'duplicate', label: 'Duplicate', icon: 'copy', shortcut: 'D' },
  { action: 'configure', label: 'Settings', icon: 'settings', shortcut: 'S' },
  { action: 'resize', label: 'Resize', icon: 'maximize-2' },
  { action: 'export', label: 'Export Data', icon: 'download' },
  { action: 'remove', label: 'Remove', icon: 'trash-2', shortcut: 'Delete', danger: true },
]

// ============================================
// WORKSPACE CONFIGURATION
// ============================================

/**
 * Workspace preset for quick setup.
 */
export interface WorkspacePreset {
  id: string
  name: string
  description: string
  icon: string
  widgets: Omit<Widget, 'id' | 'createdAt' | 'state'>[]
}

/**
 * Built-in workspace presets.
 */
export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: 'day-trader',
    name: 'Day Trader',
    description: 'Real-time prices, charts, and quick swap access',
    icon: 'trending-up',
    widgets: [
      {
        kind: 'price-ticker',
        title: 'Market Prices',
        category: 'data',
        size: SIZE_PRESETS.full,
        position: { col: 0, row: 0 },
        display: { collapsed: false, pinned: true, highlighted: false, dragging: false, editing: false },
        refresh: { ...DEFAULT_REFRESH_CONFIG, intervalSeconds: 10 },
        payload: { tokens: [] },
      },
      {
        kind: 'price-chart',
        title: 'Price Chart',
        category: 'chart',
        size: SIZE_PRESETS.large,
        position: { col: 0, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: { ...DEFAULT_REFRESH_CONFIG, intervalSeconds: 30 },
        payload: { symbol: 'ETH', timeframe: '1H' },
      },
      {
        kind: 'swap',
        title: 'Quick Swap',
        category: 'action',
        size: SIZE_PRESETS.standard,
        position: { col: 6, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: {},
      },
      {
        kind: 'gas-tracker',
        title: 'Gas Prices',
        category: 'utility',
        size: SIZE_PRESETS.compact,
        position: { col: 10, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: { ...DEFAULT_REFRESH_CONFIG, intervalSeconds: 15 },
        payload: { network: 'ethereum', low: 0, average: 0, fast: 0, unit: 'gwei' },
      },
    ],
  },
  {
    id: 'portfolio-manager',
    name: 'Portfolio Manager',
    description: 'Track holdings, allocation, and performance',
    icon: 'pie-chart',
    widgets: [
      {
        kind: 'portfolio-summary',
        title: 'Portfolio Overview',
        category: 'data',
        size: SIZE_PRESETS.wide,
        position: { col: 0, row: 0 },
        display: { collapsed: false, pinned: true, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { totalValue: 0, change24h: 0, topHoldings: [] },
      },
      {
        kind: 'allocation-pie',
        title: 'Allocation',
        category: 'chart',
        size: SIZE_PRESETS.standard,
        position: { col: 6, row: 0 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { segments: [] },
      },
      {
        kind: 'pnl-chart',
        title: 'Performance',
        category: 'chart',
        size: SIZE_PRESETS.large,
        position: { col: 0, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { timeframe: '30D' },
      },
      {
        kind: 'token-balance',
        title: 'Holdings',
        category: 'data',
        size: SIZE_PRESETS.tall,
        position: { col: 6, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { tokens: [] },
      },
    ],
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'AI insights, news, and market analysis',
    icon: 'search',
    widgets: [
      {
        kind: 'ai-summary',
        title: 'AI Market Summary',
        category: 'insight',
        size: SIZE_PRESETS.wide,
        position: { col: 0, row: 0 },
        display: { collapsed: false, pinned: true, highlighted: false, dragging: false, editing: false },
        refresh: { ...DEFAULT_REFRESH_CONFIG, intervalSeconds: 300 },
        payload: { summary: '', generatedAt: 0, topics: [] },
      },
      {
        kind: 'market-prediction',
        title: 'Market Predictions',
        category: 'insight',
        size: SIZE_PRESETS.standard,
        position: { col: 6, row: 0 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { token: 'ETH', prediction: 'neutral', confidence: 0, reasoning: '', timeframe: '24H' },
      },
      {
        kind: 'news-feed',
        title: 'Crypto News',
        category: 'insight',
        size: SIZE_PRESETS.tall,
        position: { col: 0, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: { ...DEFAULT_REFRESH_CONFIG, intervalSeconds: 120 },
        payload: { items: [] },
      },
      {
        kind: 'risk-analysis',
        title: 'Risk Assessment',
        category: 'insight',
        size: SIZE_PRESETS.standard,
        position: { col: 4, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { overallRisk: 'low', factors: [] },
      },
      {
        kind: 'notes',
        title: 'Research Notes',
        category: 'utility',
        size: SIZE_PRESETS.standard,
        position: { col: 8, row: 2 },
        display: { collapsed: false, pinned: false, highlighted: false, dragging: false, editing: false },
        refresh: DEFAULT_REFRESH_CONFIG,
        payload: { content: '' },
      },
    ],
  },
]

// ============================================
// WIDGET LINKING
// ============================================

/**
 * Widgets can be linked so selecting data in one affects others.
 * For example, clicking a token in portfolio updates the price chart.
 */
export interface WidgetLink {
  /** Source widget ID */
  sourceId: string
  /** Target widget ID */
  targetId: string
  /** What data is linked (e.g., 'token', 'timeframe') */
  linkType: 'token' | 'timeframe' | 'chain' | 'address'
}

// ============================================
// WIDGET EVENTS
// ============================================

/**
 * Events emitted by widgets for inter-widget communication.
 */
export interface WidgetEvents {
  'widget:select-token': { widgetId: string; token: string }
  'widget:select-timeframe': { widgetId: string; timeframe: string }
  'widget:select-chain': { widgetId: string; chain: string }
  'widget:data-updated': { widgetId: string; timestamp: number }
  'widget:action-triggered': { widgetId: string; action: string; data?: unknown }
}

export type WidgetEventType = keyof WidgetEvents
