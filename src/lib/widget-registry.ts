/**
 * WIDGET REGISTRY & FACTORY
 *
 * Central registry for widget metadata, creation, and management.
 * Provides a unified API for working with widgets throughout the app.
 */

import type {
  WidgetKind,
  WidgetCategory,
  Widget,
  WidgetSize,
  WidgetSizePreset,
  WidgetDisplayState,
  WidgetRefreshConfig,
  WidgetPayload,
} from '../types/widget-system'

// ============================================
// WIDGET METADATA
// ============================================

/**
 * Metadata for each widget type.
 */
export interface WidgetMetadata {
  kind: WidgetKind
  category: WidgetCategory
  name: string
  description: string
  icon: string
  defaultSize: WidgetSizePreset
  minSize: WidgetSize
  maxSize: WidgetSize
  resizable: boolean
  refreshable: boolean
  defaultRefreshInterval: number // seconds, 0 = no auto-refresh
  requiresWallet: boolean
  requiresPro: boolean
  tags: string[]
}

/**
 * Complete widget registry with metadata for all widget types.
 */
export const WIDGET_REGISTRY: Record<WidgetKind, WidgetMetadata> = {
  // ===== DATA WIDGETS =====
  'portfolio-summary': {
    kind: 'portfolio-summary',
    category: 'data',
    name: 'Portfolio Summary',
    description: 'Overview of your total portfolio value and top holdings',
    icon: 'wallet',
    defaultSize: 'wide',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: true,
    requiresPro: false,
    tags: ['portfolio', 'balance', 'overview'],
  },
  'token-balance': {
    kind: 'token-balance',
    category: 'data',
    name: 'Token Balances',
    description: 'Detailed list of all your token holdings',
    icon: 'coins',
    defaultSize: 'tall',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: true,
    requiresPro: false,
    tags: ['tokens', 'balance', 'holdings'],
  },
  'price-ticker': {
    kind: 'price-ticker',
    category: 'data',
    name: 'Price Ticker',
    description: 'Real-time price updates for selected tokens',
    icon: 'activity',
    defaultSize: 'full',
    minSize: { cols: 6, rows: 1 },
    maxSize: { cols: 12, rows: 2 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 10,
    requiresWallet: false,
    requiresPro: false,
    tags: ['prices', 'market', 'real-time'],
  },
  'watchlist': {
    kind: 'watchlist',
    category: 'data',
    name: 'Watchlist',
    description: 'Track tokens you\'re interested in',
    icon: 'star',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 30,
    requiresWallet: false,
    requiresPro: false,
    tags: ['watchlist', 'favorites', 'tracking'],
  },
  'wallet-overview': {
    kind: 'wallet-overview',
    category: 'data',
    name: 'Wallet Overview',
    description: 'Multi-chain wallet summary',
    icon: 'layers',
    defaultSize: 'standard',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 6, rows: 3 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 120,
    requiresWallet: true,
    requiresPro: false,
    tags: ['wallet', 'multi-chain', 'overview'],
  },

  // ===== CHART WIDGETS =====
  'price-chart': {
    kind: 'price-chart',
    category: 'chart',
    name: 'Price Chart',
    description: 'Interactive price chart for any token',
    icon: 'trending-up',
    defaultSize: 'large',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 30,
    requiresWallet: false,
    requiresPro: false,
    tags: ['chart', 'price', 'technical'],
  },
  'portfolio-chart': {
    kind: 'portfolio-chart',
    category: 'chart',
    name: 'Portfolio Chart',
    description: 'Historical portfolio value over time',
    icon: 'line-chart',
    defaultSize: 'large',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 300,
    requiresWallet: true,
    requiresPro: false,
    tags: ['chart', 'portfolio', 'history'],
  },
  'allocation-pie': {
    kind: 'allocation-pie',
    category: 'chart',
    name: 'Allocation Pie',
    description: 'Visual breakdown of your portfolio allocation',
    icon: 'pie-chart',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 3 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: true,
    requiresPro: false,
    tags: ['chart', 'allocation', 'pie'],
  },
  'pnl-chart': {
    kind: 'pnl-chart',
    category: 'chart',
    name: 'P&L Chart',
    description: 'Profit and loss tracking over time',
    icon: 'bar-chart-2',
    defaultSize: 'large',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 300,
    requiresWallet: true,
    requiresPro: true,
    tags: ['chart', 'pnl', 'performance'],
  },
  'volume-chart': {
    kind: 'volume-chart',
    category: 'chart',
    name: 'Volume Chart',
    description: 'Trading volume visualization',
    icon: 'bar-chart',
    defaultSize: 'wide',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: false,
    requiresPro: false,
    tags: ['chart', 'volume', 'trading'],
  },

  // ===== ACTION WIDGETS =====
  'swap': {
    kind: 'swap',
    category: 'action',
    name: 'Swap',
    description: 'Quick token swap interface',
    icon: 'repeat',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 4, rows: 3 },
    resizable: false,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: true,
    requiresPro: false,
    tags: ['swap', 'trade', 'action'],
  },
  'bridge': {
    kind: 'bridge',
    category: 'action',
    name: 'Bridge',
    description: 'Bridge tokens across chains',
    icon: 'git-branch',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 4, rows: 3 },
    resizable: false,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: true,
    requiresPro: false,
    tags: ['bridge', 'cross-chain', 'action'],
  },
  'send': {
    kind: 'send',
    category: 'action',
    name: 'Send',
    description: 'Send tokens to another address',
    icon: 'send',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 4, rows: 3 },
    resizable: false,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: true,
    requiresPro: false,
    tags: ['send', 'transfer', 'action'],
  },
  'stake': {
    kind: 'stake',
    category: 'action',
    name: 'Stake',
    description: 'Stake tokens in supported protocols',
    icon: 'lock',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 4, rows: 3 },
    resizable: false,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: true,
    requiresPro: false,
    tags: ['stake', 'yield', 'action'],
  },
  'perps-trade': {
    kind: 'perps-trade',
    category: 'action',
    name: 'Perps Trade',
    description: 'Perpetual futures trading simulator',
    icon: 'zap',
    defaultSize: 'tall',
    minSize: { cols: 4, rows: 3 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: true,
    requiresPro: true,
    tags: ['perps', 'trading', 'leverage'],
  },

  // ===== INSIGHT WIDGETS =====
  'ai-summary': {
    kind: 'ai-summary',
    category: 'insight',
    name: 'AI Summary',
    description: 'AI-generated market and portfolio insights',
    icon: 'sparkles',
    defaultSize: 'wide',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 300,
    requiresWallet: false,
    requiresPro: false,
    tags: ['ai', 'summary', 'insights'],
  },
  'market-prediction': {
    kind: 'market-prediction',
    category: 'insight',
    name: 'Market Prediction',
    description: 'AI-powered market predictions',
    icon: 'target',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 3 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 600,
    requiresWallet: false,
    requiresPro: true,
    tags: ['prediction', 'ai', 'forecast'],
  },
  'risk-analysis': {
    kind: 'risk-analysis',
    category: 'insight',
    name: 'Risk Analysis',
    description: 'Portfolio risk assessment',
    icon: 'shield',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 3 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 300,
    requiresWallet: true,
    requiresPro: true,
    tags: ['risk', 'analysis', 'safety'],
  },
  'opportunity-alert': {
    kind: 'opportunity-alert',
    category: 'insight',
    name: 'Opportunities',
    description: 'Alerts for yields, airdrops, and more',
    icon: 'bell',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 180,
    requiresWallet: false,
    requiresPro: true,
    tags: ['alerts', 'opportunities', 'defi'],
  },
  'news-feed': {
    kind: 'news-feed',
    category: 'insight',
    name: 'News Feed',
    description: 'Curated crypto news with sentiment',
    icon: 'newspaper',
    defaultSize: 'tall',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 120,
    requiresWallet: false,
    requiresPro: false,
    tags: ['news', 'feed', 'updates'],
  },

  // ===== HISTORY WIDGETS =====
  'transaction-history': {
    kind: 'transaction-history',
    category: 'history',
    name: 'Transactions',
    description: 'Recent transaction history',
    icon: 'list',
    defaultSize: 'tall',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 30,
    requiresWallet: true,
    requiresPro: false,
    tags: ['transactions', 'history', 'activity'],
  },
  'chat-history': {
    kind: 'chat-history',
    category: 'history',
    name: 'Chat History',
    description: 'Previous AI conversations',
    icon: 'message-square',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: false,
    requiresPro: false,
    tags: ['chat', 'history', 'conversations'],
  },
  'activity-log': {
    kind: 'activity-log',
    category: 'history',
    name: 'Activity Log',
    description: 'Complete activity timeline',
    icon: 'clock',
    defaultSize: 'tall',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: false,
    requiresPro: false,
    tags: ['activity', 'log', 'timeline'],
  },

  // ===== UTILITY WIDGETS =====
  'gas-tracker': {
    kind: 'gas-tracker',
    category: 'utility',
    name: 'Gas Tracker',
    description: 'Real-time gas prices',
    icon: 'fuel',
    defaultSize: 'standard',
    minSize: { cols: 4, rows: 1 },
    maxSize: { cols: 6, rows: 2 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 15,
    requiresWallet: false,
    requiresPro: false,
    tags: ['gas', 'ethereum', 'fees'],
  },
  'calculator': {
    kind: 'calculator',
    category: 'utility',
    name: 'Calculator',
    description: 'Token value and gas calculator',
    icon: 'calculator',
    defaultSize: 'compact',
    minSize: { cols: 2, rows: 1 },
    maxSize: { cols: 4, rows: 2 },
    resizable: true,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: false,
    requiresPro: false,
    tags: ['calculator', 'math', 'utility'],
  },
  'notes': {
    kind: 'notes',
    category: 'utility',
    name: 'Notes',
    description: 'Personal research notes',
    icon: 'file-text',
    defaultSize: 'standard',
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: false,
    requiresPro: false,
    tags: ['notes', 'text', 'research'],
  },
  'quick-links': {
    kind: 'quick-links',
    category: 'utility',
    name: 'Quick Links',
    description: 'Saved links and bookmarks',
    icon: 'link',
    defaultSize: 'compact',
    minSize: { cols: 2, rows: 1 },
    maxSize: { cols: 4, rows: 2 },
    resizable: true,
    refreshable: false,
    defaultRefreshInterval: 0,
    requiresWallet: false,
    requiresPro: false,
    tags: ['links', 'bookmarks', 'shortcuts'],
  },

  // ===== POLICY WIDGETS =====
  'risk-policy': {
    kind: 'risk-policy',
    category: 'utility',
    name: 'Risk Policy',
    description: 'Configure your trading risk preferences and limits',
    icon: 'shield',
    defaultSize: 'tall',
    minSize: { cols: 4, rows: 3 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 0,
    requiresWallet: true,
    requiresPro: false,
    tags: ['policy', 'risk', 'settings', 'limits'],
  },
  'session-keys': {
    kind: 'session-keys',
    category: 'utility',
    name: 'Session Keys',
    description: 'Manage agent permissions and session keys',
    icon: 'key',
    defaultSize: 'tall',
    minSize: { cols: 4, rows: 3 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 30,
    requiresWallet: true,
    requiresPro: false,
    tags: ['policy', 'session', 'agent', 'permissions', 'keys'],
  },
  'policy-status': {
    kind: 'policy-status',
    category: 'utility',
    name: 'Policy Status',
    description: 'System status and policy overview',
    icon: 'activity',
    defaultSize: 'compact',
    minSize: { cols: 3, rows: 1 },
    maxSize: { cols: 4, rows: 2 },
    resizable: false,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: false,
    requiresPro: false,
    tags: ['policy', 'status', 'system', 'health'],
  },
  'dca-strategies': {
    kind: 'dca-strategies',
    category: 'utility',
    name: 'DCA Strategies',
    description: 'Dollar cost averaging strategies for automated buying',
    icon: 'repeat',
    defaultSize: 'tall',
    minSize: { cols: 4, rows: 3 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 60,
    requiresWallet: true,
    requiresPro: false,
    tags: ['dca', 'strategy', 'automation', 'trading'],
  },
  'my-strategies': {
    kind: 'my-strategies',
    category: 'utility',
    name: 'My Strategies',
    description: 'View and manage AI-created trading strategies',
    icon: 'briefcase',
    defaultSize: 'tall',
    minSize: { cols: 4, rows: 3 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 30,
    requiresWallet: true,
    requiresPro: false,
    tags: ['strategy', 'automation', 'trading', 'ai'],
  },
  'pending-approvals': {
    kind: 'pending-approvals',
    category: 'action',
    name: 'Pending Approvals',
    description: 'Strategy executions waiting for your approval',
    icon: 'clock',
    defaultSize: 'standard',
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 6, rows: 4 },
    resizable: true,
    refreshable: true,
    defaultRefreshInterval: 30,
    requiresWallet: true,
    requiresPro: false,
    tags: ['strategy', 'approval', 'execution', 'pending'],
  },
}

// ============================================
// WIDGET FACTORY
// ============================================

/**
 * Generate a unique widget ID.
 */
function generateWidgetId(kind: WidgetKind): string {
  return `widget_${kind}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Size presets lookup.
 */
const SIZE_PRESETS_MAP: Record<WidgetSizePreset, WidgetSize> = {
  compact: { cols: 3, rows: 1 },
  standard: { cols: 4, rows: 2 },
  wide: { cols: 6, rows: 2 },
  tall: { cols: 4, rows: 3 },
  large: { cols: 6, rows: 3 },
  full: { cols: 12, rows: 2 },
}

/**
 * Default refresh configuration.
 */
const DEFAULT_REFRESH: WidgetRefreshConfig = {
  enabled: true,
  intervalSeconds: 60,
  staleThresholdSeconds: 300,
  lastRefreshedAt: null,
}

/**
 * Default display state.
 */
const DEFAULT_DISPLAY: WidgetDisplayState = {
  collapsed: false,
  pinned: false,
  highlighted: true, // New widgets start highlighted
  dragging: false,
  editing: false,
}

/**
 * Default payload for each widget kind.
 */
function getDefaultPayload(kind: WidgetKind): WidgetPayload {
  const defaults: Record<WidgetKind, WidgetPayload> = {
    'portfolio-summary': { totalValue: 0, change24h: 0, topHoldings: [] },
    'token-balance': { tokens: [] },
    'price-ticker': { tokens: [] },
    'watchlist': { tokens: [] },
    'wallet-overview': { address: '', totalValue: 0, chains: [] },
    'price-chart': { symbol: 'ETH', timeframe: '24H' },
    'portfolio-chart': { timeframe: '30D' },
    'allocation-pie': { segments: [] },
    'pnl-chart': { timeframe: '30D' },
    'volume-chart': { timeframe: '24H' },
    'swap': {},
    'bridge': {},
    'send': {},
    'stake': {},
    'perps-trade': {},
    'ai-summary': { summary: '', generatedAt: 0, topics: [] },
    'market-prediction': { token: 'ETH', prediction: 'neutral', confidence: 0, reasoning: '', timeframe: '24H' },
    'risk-analysis': { overallRisk: 'low', factors: [] },
    'opportunity-alert': { alerts: [] },
    'news-feed': { items: [] },
    'transaction-history': { transactions: [] },
    'chat-history': { sessions: [] },
    'activity-log': { activities: [] },
    'gas-tracker': { network: 'ethereum', low: 0, average: 0, fast: 0, unit: 'gwei' },
    'calculator': { mode: 'token' },
    'notes': { content: '' },
    'quick-links': { links: [] },
    // Policy widgets
    'risk-policy': { config: null, status: 'idle' },
    'session-keys': { sessions: [], status: 'idle' },
    'policy-status': {
      operational: true,
      emergencyStop: false,
      inMaintenance: false,
      allowedChains: [1, 137, 42161, 8453, 10],
      maxSingleTxUsd: 100000,
    },
    // Strategy widgets
    'dca-strategies': {
      walletAddress: '',
      userId: undefined,
      walletId: undefined,
    },
    'my-strategies': {
      walletAddress: '',
      statusFilter: undefined,
    },
    'pending-approvals': {
      walletAddress: '',
    },
  }
  return defaults[kind]
}

/**
 * Create options for widget factory.
 */
export interface CreateWidgetOptions {
  kind: WidgetKind
  title?: string
  position?: { col: number; row: number }
  size?: WidgetSize | WidgetSizePreset
  payload?: Partial<WidgetPayload>
  settings?: Record<string, unknown>
}

/**
 * Create a new widget with proper defaults.
 */
export function createWidget(options: CreateWidgetOptions): Widget {
  const metadata = WIDGET_REGISTRY[options.kind]

  // Resolve size
  let size: WidgetSize
  if (!options.size) {
    size = SIZE_PRESETS_MAP[metadata.defaultSize]
  } else if (typeof options.size === 'string') {
    size = SIZE_PRESETS_MAP[options.size]
  } else {
    size = options.size
  }

  // Merge payload with defaults
  const defaultPayload = getDefaultPayload(options.kind)
  const payload = { ...defaultPayload, ...options.payload } as WidgetPayload

  return {
    id: generateWidgetId(options.kind),
    kind: options.kind,
    title: options.title || metadata.name,
    category: metadata.category,
    size,
    position: options.position || { col: 0, row: 0 },
    display: { ...DEFAULT_DISPLAY },
    refresh: {
      ...DEFAULT_REFRESH,
      enabled: metadata.refreshable,
      intervalSeconds: metadata.defaultRefreshInterval,
    },
    createdAt: Date.now(),
    settings: options.settings,
    payload,
    state: 'loading',
  }
}

// ============================================
// WIDGET UTILITIES
// ============================================

/**
 * Get metadata for a widget kind.
 */
export function getWidgetMetadata(kind: WidgetKind): WidgetMetadata {
  return WIDGET_REGISTRY[kind]
}

/**
 * Get all widgets in a category.
 */
export function getWidgetsByCategory(category: WidgetCategory): WidgetMetadata[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.category === category)
}

/**
 * Get all widgets that don't require wallet connection.
 */
export function getPublicWidgets(): WidgetMetadata[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => !w.requiresWallet)
}

/**
 * Get all pro-only widgets.
 */
export function getProWidgets(): WidgetMetadata[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.requiresPro)
}

/**
 * Search widgets by tag or name.
 */
export function searchWidgets(query: string): WidgetMetadata[] {
  const lowerQuery = query.toLowerCase()
  return Object.values(WIDGET_REGISTRY).filter(
    (w) =>
      w.name.toLowerCase().includes(lowerQuery) ||
      w.description.toLowerCase().includes(lowerQuery) ||
      w.tags.some((tag) => tag.includes(lowerQuery))
  )
}

/**
 * Check if a widget is stale (needs refresh).
 */
export function isWidgetStale(widget: Widget): boolean {
  if (!widget.refresh.enabled || !widget.refresh.lastRefreshedAt) return false
  const elapsed = (Date.now() - widget.refresh.lastRefreshedAt) / 1000
  return elapsed > widget.refresh.staleThresholdSeconds
}

/**
 * Check if a widget needs auto-refresh.
 */
export function needsAutoRefresh(widget: Widget): boolean {
  if (!widget.refresh.enabled || widget.refresh.intervalSeconds === 0) return false
  if (!widget.refresh.lastRefreshedAt) return true
  const elapsed = (Date.now() - widget.refresh.lastRefreshedAt) / 1000
  return elapsed >= widget.refresh.intervalSeconds
}

/**
 * Clone a widget with a new ID.
 */
export function duplicateWidget(widget: Widget): Widget {
  return {
    ...widget,
    id: generateWidgetId(widget.kind),
    createdAt: Date.now(),
    display: {
      ...widget.display,
      highlighted: true,
      pinned: false,
    },
    position: {
      col: widget.position.col,
      row: widget.position.row + widget.size.rows, // Place below original
    },
  }
}

// ============================================
// CATEGORY INFO
// ============================================

export interface CategoryInfo {
  id: WidgetCategory
  name: string
  description: string
  icon: string
  color: string
}

export const WIDGET_CATEGORIES: CategoryInfo[] = [
  {
    id: 'data',
    name: 'Data',
    description: 'Portfolio and token information',
    icon: 'database',
    color: '#60a5fa', // Blue
  },
  {
    id: 'chart',
    name: 'Charts',
    description: 'Visualizations and graphs',
    icon: 'bar-chart-2',
    color: '#34d399', // Green
  },
  {
    id: 'action',
    name: 'Actions',
    description: 'Trade, swap, and send tokens',
    icon: 'zap',
    color: '#f59e0b', // Amber
  },
  {
    id: 'insight',
    name: 'Insights',
    description: 'AI analysis and predictions',
    icon: 'sparkles',
    color: '#a78bfa', // Purple
  },
  {
    id: 'history',
    name: 'History',
    description: 'Activity and transaction logs',
    icon: 'clock',
    color: '#6b7280', // Gray
  },
  {
    id: 'utility',
    name: 'Utility',
    description: 'Tools and helpers',
    icon: 'wrench',
    color: '#ec4899', // Pink
  },
]
