import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

import type { AgentAction, AgentMessage, Panel, PanelSource } from '../types/defi-ui'
import type { PersonaId as Persona } from '../types/persona'
import type { EntitlementSnapshot } from '../types/entitlement'
import type { PortfolioSummaryViewModel, WorkspaceRequestStatus } from '../workspace/types'
import { api } from '../services/api'
import { transformBackendPanels } from '../services/panels'
import type { Widget, WidgetDensity } from '../types/widgets'
import { getSwapQuote } from '../services/quotes'
import { getTopPrices } from '../services/prices'
import { getTrendingTokens, type TrendingToken } from '../services/trending'
import { truncateAddress } from '../services/wallet'
import { getFlag, setFlag } from '../utils/prefs'
import { SimulateModal } from '../components/modals/SimulateModal'
import { SwapModal } from '../components/modals/SwapModal'
import { BridgeModal } from '../components/modals/BridgeModal'
import { RelayQuoteModal } from '../components/modals/RelayQuoteModal'
import { PortfolioRailChip } from '../components/conversation/PortfolioRailChip'
import { ExpandedPanelModal } from '../components/panels/ExpandedPanelModal'
import type { HeaderBarProps } from '../components/header/HeaderBar'
import type { ChatSurfaceProps } from '../components/surfaces/ChatSurface'
import type { WorkspaceSurfaceProps } from '../components/surfaces/WorkspaceSurface'
import { useWalletClient, usePublicClient, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'

import type { ShellUIState, ShellUIAction } from './useShellUIReducer'

const seedWidgets: Widget[] = []

const seedIntro: AgentMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Hey! I can analyze tokens, protocols, and your portfolio. What do you want to look at today?',
    actions: [
      { id: 'a1', label: 'Show my portfolio', type: 'show_panel', params: { panel_id: 'portfolio_overview' } },
      { id: 'a2', label: 'Top coins today', type: 'show_panel', params: { panel_id: 'top_coins' } },
      { id: 'a3', label: 'Trending tokens', type: 'show_panel', params: { panel_id: 'trending_tokens' } },
    ],
  },
]

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

const WETH_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

function getExplorerUrl(chain: string | null | undefined, address: string | null | undefined) {
  if (!address) return undefined
  const target = address
  const network = (chain || 'ethereum').toLowerCase()
  switch (network) {
    case 'ethereum':
    case 'mainnet':
      return `https://etherscan.io/address/${target}`
    case 'sepolia':
      return `https://sepolia.etherscan.io/address/${target}`
    case 'goerli':
      return `https://goerli.etherscan.io/address/${target}`
    case 'polygon':
    case 'polygon-mainnet':
    case 'matic':
      return `https://polygonscan.com/address/${target}`
    default:
      return undefined
  }
}

function toSourceLinks(sources?: PanelSource[]): Array<{ label: string; href?: string }> {
  if (!Array.isArray(sources)) return []
  return sources.map((source, index) => {
    const label = source.title || source.name || source.id || source.url || source.href || `source-${index + 1}`
    const href = source.url || source.href
    return { label, href }
  })
}

function inferDensity(panel: Panel): WidgetDensity {
  if (panel.kind === 'portfolio') return 'full'
  if (panel.metadata?.layout === 'banner') return 'full'
  return 'rail'
}

function panelToWidget(panel: Panel): Widget {
  return {
    id: panel.id,
    kind: panel.kind,
    title: panel.title,
    payload: panel.payload,
    sources: toSourceLinks(panel.sources),
    density: inferDensity(panel),
  }
}

function applyOrder(list: Widget[]): Widget[] {
  return list.map((widget, index) => ({ ...widget, order: index }))
}

function upsertWidgets(current: Widget[], incoming: Widget[]): Widget[] {
  const incomingIds = new Set(incoming.map((widget) => widget.id))
  const filtered = current.filter((widget) => !incomingIds.has(widget.id))
  return applyOrder([...incoming, ...filtered])
}

function removeWidgetById(current: Widget[], id: string): Widget[] {
  return applyOrder(current.filter((widget) => widget.id !== id))
}

function moveWidgetInList(current: Widget[], id: string, direction: 'up' | 'down'): Widget[] {
  const index = current.findIndex((widget) => widget.id === id)
  if (index < 0) return current
  const targetIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(current.length - 1, index + 1)
  if (index === targetIndex) return current
  const next = current.slice()
  const [item] = next.splice(index, 1)
  next.splice(targetIndex, 0, item)
  return applyOrder(next)
}

export interface DeFiChatAdaptiveUIProps {
  persona: Persona
  setPersona: (persona: Persona) => void
  walletAddress?: string
  pro: boolean
  entitlement: EntitlementSnapshot
  onRequestPro: (source: 'cta' | 'action') => void
  allowManualUnlock?: boolean
  onManualUnlock?: () => void
  portfolioSummary?: PortfolioSummaryViewModel
  portfolioStatus?: WorkspaceRequestStatus
  portfolioError?: string | null
  onRefreshPortfolio: () => Promise<void>
  portfolioRefreshing?: boolean
  llmModel?: string
}

export interface UseDeFiChatControllerParams {
  props: DeFiChatAdaptiveUIProps
  shellState: ShellUIState
  dispatch: React.Dispatch<ShellUIAction>
}

export interface UseDeFiChatControllerResult {
  headerProps: {
    persona: Persona
    walletLabel: string
    walletConnected: boolean
    proLabel: string
    onPersonaChange: (persona: Persona) => void
    onNewChat: () => void
    onPlanWorkflow: () => void
    onShowTrending: () => void
    onOpenWorkspace: () => void
  }
  chatSurfaceProps: ChatSurfaceProps
  workspaceSurfaceProps: WorkspaceSurfaceProps
  surface: {
    active: ShellUIState['activeSurface']
    workspaceLabel: string
    conversationLabel: string
    onSurfaceChange: (surface: ShellUIState['activeSurface']) => void
    portfolioChip: React.ReactNode
  }
  modals: React.ReactNode
  helpers: {
    scrollRef: React.RefObject<HTMLDivElement>
    inputRef: React.RefObject<HTMLTextAreaElement>
    prefersReducedMotion: boolean
  }
}

export function useDeFiChatController({ props, shellState, dispatch }: UseDeFiChatControllerParams): UseDeFiChatControllerResult {
  const {
    persona,
    setPersona,
    walletAddress,
    pro,
    entitlement,
    onRequestPro,
    allowManualUnlock,
    onManualUnlock,
    portfolioSummary,
    portfolioStatus = 'idle',
    portfolioError,
    onRefreshPortfolio,
    portfolioRefreshing = false,
    llmModel,
  } = props

  const prefersReducedMotion = useReducedMotion() ?? false

  const storageKey = useCallback((addr?: string | null) => (addr ? `sherpa.conversation_id:${addr.toLowerCase()}` : 'sherpa.conversation_id:guest'), [])

  const [messages, setMessages] = useState<AgentMessage[]>(seedIntro)
  const [widgets, setWidgets] = useState<Widget[]>(seedWidgets)
  const [hasNudgedWorkspace, setHasNudgedWorkspace] = useState(() => getFlag('ws.nudged'))
  const [coachMarkDismissed, setCoachMarkDismissed] = useState(() => getFlag('ws.tip.dismissed'))
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      const key = storageKey(walletAddress ?? null)
      const stored = localStorage.getItem(key)
      return stored || undefined
    } catch {
      return undefined
    }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const copyInfoTimeout = useRef<number | null>(null)
  const lastAnnouncedId = useRef<string | null>(null)
  const portfolioHighlightPending = useRef(Boolean(walletAddress))
  const prevPortfolioFetchRef = useRef<string | null>(null)
  const isAssistantTyping = useMemo(() => messages.some((msg) => msg.typing), [messages])

  const {
    activeSurface,
    highlight,
    panelUI,
    expandedPanelId,
    showProInfo,
    copiedToken,
    showSim,
    showSwap,
    showBridge,
    showRelay,
    ariaAnnouncement,
  } = shellState

  const setHighlight = useCallback((value?: string[]) => dispatch({ type: 'setHighlight', highlight: value }), [dispatch])
  const setExpandedPanelId = useCallback((value: string | null) => dispatch({ type: 'setExpandedPanel', panelId: value }), [dispatch])
  const setShowProInfo = useCallback((value: boolean) => dispatch({ type: 'setShowProInfo', value }), [dispatch])
  const setCopiedToken = useCallback((value: boolean) => dispatch({ type: 'setCopiedToken', value }), [dispatch])
  const setShowSim = useCallback((value: { from?: string; to?: string } | null) => dispatch({ type: 'setShowSim', value }), [dispatch])
  const setShowSwap = useCallback((value: { from?: string; to?: string } | null) => dispatch({ type: 'setShowSwap', value }), [dispatch])
  const setShowBridge = useCallback((value: boolean) => dispatch({ type: 'setShowBridge', value }), [dispatch])
  const setShowRelay = useCallback((value: boolean) => dispatch({ type: 'setShowRelay', value }), [dispatch])
  const setActiveSurface = useCallback((surface: ShellUIState['activeSurface']) => dispatch({ type: 'setActiveSurface', surface }), [dispatch])
  const setAriaAnnouncement = useCallback((value: string) => dispatch({ type: 'setAriaAnnouncement', value }), [dispatch])
  const resetPanelUI = useCallback(() => dispatch({ type: 'resetPanelUI' }), [dispatch])

  const isMounted = useRef(true)

  const manualUnlockAvailable = Boolean(!pro && allowManualUnlock && onManualUnlock)
  const proTokenAddress = entitlement.tokenAddress || null
  const proBadgeLabel = pro ? 'Pro' : entitlement.gating === 'token' ? 'Pro Locked' : 'Pro Preview'
  const proRequirement = useMemo(() => {
    if (pro) return 'Pro access is active.'
    if (entitlement.reason) return entitlement.reason
    if (entitlement.gating === 'token') return 'Hold the Sherpa Pro token to unlock.'
    if (entitlement.status === 'error') return 'Entitlement service is unavailable right now.'
    if (entitlement.status === 'disabled') return 'Pro gating is disabled in this environment.'
    return 'Upgrade to Sherpa Pro for deeper strategy, alerts, and fee rebates.'
  }, [entitlement.gating, entitlement.reason, entitlement.status, pro])
  const proExplorerUrl = useMemo(() => getExplorerUrl(entitlement.chain ?? null, proTokenAddress), [entitlement.chain, proTokenAddress])
  const proContractDisplay = useMemo(() => (proTokenAddress ? truncateAddress(proTokenAddress, 6) : null), [proTokenAddress])

  const walletClientResult = useWalletClient()
  const { data: walletClient } = walletClientResult
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const walletReady = Boolean(walletClient)

  useEffect(() => () => {
    isMounted.current = false
  }, [])

  const focusInput = useCallback(() => {
    const element = inputRef.current
    if (!element) return
    element.focus()
    const pos = element.value.length
    element.setSelectionRange(pos, pos)
  }, [])

  const handleInsertQuickPrompt = useCallback((prompt: string) => {
    const text = String(prompt ?? '').trim()
    if (!text) return
    setInput((previous) => {
      if (!previous.trim()) return text
      const separator = previous.endsWith('\n') ? '' : '\n'
      return `${previous}${separator}${text}`
    })
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focusInput)
    } else {
      focusInput()
    }
  }, [focusInput])

  const scheduleScrollToBottom = useCallback(() => {
    window.setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'
      el.scrollTo({ top: el.scrollHeight, behavior })
    }, 0)
  }, [prefersReducedMotion])

  useEffect(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && !message.typing)

    if (latestAssistant && latestAssistant.id !== lastAnnouncedId.current) {
      const text = latestAssistant.text.replace(/\s+/g, ' ').trim()
      setAriaAnnouncement(text)
      lastAnnouncedId.current = latestAssistant.id
    }
  }, [messages, setAriaAnnouncement])

  const loadTopCoinsPanel = useCallback(async () => {
    const coins = await getTopPrices(5)
    const widget: Widget = {
      id: 'top_coins',
      kind: 'prices',
      title: 'Top Coins (excl. stablecoins)',
      payload: { coins },
      sources: [{ label: 'CoinGecko', href: 'https://www.coingecko.com' }],
      density: 'rail',
    }
    setWidgets((previous) => upsertWidgets(previous, [widget]))
    setHighlight(['top_coins'])
  }, [setHighlight])

  const loadTrendingTokensPanel = useCallback(async (options: { highlight?: boolean } = {}) => {
    const { highlight: forceHighlight = false } = options
    let tokens: TrendingToken[] = []
    let errorMessage: string | undefined

    try {
      tokens = await getTrendingTokens(8)
    } catch (error: any) {
      errorMessage = error?.message || 'Unable to load trending tokens.'
    }

    if (!isMounted.current) return

    const widget: Widget = {
      id: 'trending_tokens',
      kind: 'trending',
      title: 'Trending Tokens (Relay-ready)',
      payload: { tokens, fetchedAt: new Date().toISOString(), error: errorMessage, layout: 'banner' },
      sources: [
        { label: 'CoinGecko', href: 'https://www.coingecko.com' },
        { label: 'Relay', href: 'https://relay.link' },
      ],
      density: 'full',
    }

    const existed = widgets.some((candidate) => candidate.id === 'trending_tokens')
    setWidgets((previous) => upsertWidgets(previous, [widget]))

    if (forceHighlight || !existed) {
      setHighlight(['trending_tokens'])
    }
  }, [setHighlight, widgets])

  useEffect(() => {
    loadTrendingTokensPanel({ highlight: true }).catch(() => {})
    const interval = window.setInterval(() => {
      loadTrendingTokensPanel().catch(() => {})
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [loadTrendingTokensPanel])

  useEffect(() => {
    try {
      const key = storageKey(walletAddress ?? null)
      const stored = localStorage.getItem(key) || undefined
      setConversationId(stored)
    } catch {
      setConversationId(undefined)
    }
  }, [storageKey, walletAddress])

  useEffect(() => {
    if (widgets.length > 0 && !hasNudgedWorkspace) {
      setFlag('ws.nudged', true)
      setHasNudgedWorkspace(true)
      setActiveSurface('workspace')
    }
  }, [widgets.length, hasNudgedWorkspace, setActiveSurface])

  const mergeWidgetsLocal = useCallback((current: Widget[], incoming: Widget[]): Widget[] => upsertWidgets(current, incoming), [])

  useEffect(() => {
    if (!portfolioSummary) {
      prevPortfolioFetchRef.current = null
      setWidgets((prev) => removeWidgetById(prev, 'portfolio_overview'))
      return
    }

    const fetchedKey = portfolioSummary.fetchedAt || `${portfolioSummary.totalUsd}`
    const existed = widgets.some((candidate) => candidate.id === 'portfolio_overview')
    const needsUpdate = prevPortfolioFetchRef.current !== fetchedKey

    if (needsUpdate) {
      prevPortfolioFetchRef.current = fetchedKey
    }

    const payload = {
      totalUsd: portfolioSummary.totalUsd,
      positions: portfolioSummary.positions,
      allPositions: portfolioSummary.allPositions,
      topPositions: portfolioSummary.topPositions,
      tokenCount: portfolioSummary.tokenCount,
      fetchedAt: portfolioSummary.fetchedAt,
      sources: portfolioSummary.sources,
      raw: portfolioSummary.raw,
    }

    const widget: Widget = {
      id: 'portfolio_overview',
      kind: 'portfolio',
      title: 'Your Portfolio Snapshot',
      payload,
      sources: toSourceLinks(portfolioSummary.sources),
      density: 'full',
    }

    setWidgets((prev) => upsertWidgets(prev, [widget]))

    if ((needsUpdate || !existed || portfolioHighlightPending.current) && portfolioHighlightPending.current) {
      setHighlight(['portfolio_overview'])
      portfolioHighlightPending.current = false
    }
  }, [portfolioSummary, setHighlight, widgets])

  const handleProUpsell = useCallback((source: 'cta' | 'action') => {
    onRequestPro(source)
    setShowProInfo(true)
    setCopiedToken(false)
  }, [onRequestPro, setCopiedToken, setShowProInfo])

  const handleCopyToken = useCallback(async () => {
    if (!proTokenAddress) return
    try {
      await navigator.clipboard?.writeText(proTokenAddress)
      setCopiedToken(true)
      if (copyInfoTimeout.current) window.clearTimeout(copyInfoTimeout.current)
      copyInfoTimeout.current = window.setTimeout(() => setCopiedToken(false), 2400)
    } catch (error) {
      console.warn('Failed to copy contract address', error)
      setCopiedToken(false)
    }
  }, [proTokenAddress, setCopiedToken])

  const ensurePortfolioPanel = useCallback(
    ({ refresh = false, highlight: highlightPanel = true }: { refresh?: boolean; highlight?: boolean } = {}) => {
      if (!walletAddress) return false
      if (refresh || !portfolioSummary) {
        if (highlightPanel) portfolioHighlightPending.current = true
        onRefreshPortfolio().catch(() => {})
        return true
      }
      if (highlightPanel) {
        setHighlight(['portfolio_overview'])
        portfolioHighlightPending.current = false
      }
      return true
    },
    [walletAddress, portfolioSummary, onRefreshPortfolio, setHighlight],
  )

  const openPortfolioWorkspace = useCallback(
    (forceRefresh = false) => {
      ensurePortfolioPanel({ refresh: forceRefresh || !portfolioSummary, highlight: true })
      setActiveSurface('workspace')
    },
    [ensurePortfolioPanel, portfolioSummary, setActiveSurface],
  )

  const dismissCoachMark = useCallback(() => {
    setCoachMarkDismissed(true)
    setFlag('ws.tip.dismissed', true)
  }, [])

  const sendPrompt = useCallback(async (raw: string) => {
    const question = raw.trim()
    if (!question) return

    const typingId = uid('msg')
    const userMessage: AgentMessage = { id: uid('msg'), role: 'user', text: question }
    const typingMessage: AgentMessage = { id: typingId, role: 'assistant', text: '', typing: true }

    setMessages((previous) => [...previous, userMessage, typingMessage])

    try {
      const payload = {
        messages: [{ role: 'user', content: question }],
        address: walletAddress,
        chain: 'ethereum',
        conversation_id: conversationId,
        llm_model: llmModel,
      }

      const response = await api.chat(payload)

      if (response?.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id)
        try {
          localStorage.setItem(storageKey(walletAddress ?? null), response.conversation_id)
        } catch {
          // ignore storage failures
        }
      }

      const newPanels = transformBackendPanels(response.panels)
      const newWidgets = newPanels.map(panelToWidget)
      const portfolioWidgets = newWidgets.filter((widget) => widget.kind === 'portfolio')
      const nonPortfolioWidgets = newWidgets.filter((widget) => widget.kind !== 'portfolio')

      if (portfolioWidgets.length) {
        if (!walletAddress) {
          setMessages((previous) =>
            previous
              .filter((message) => message.id !== typingId)
              .concat({ id: uid('msg'), role: 'assistant', text: 'Please connect your wallet to view your portfolio.' }),
          )
        } else {
          ensurePortfolioPanel({ refresh: true, highlight: true })
        }
      }

      if (nonPortfolioWidgets.length) {
        setWidgets((previous) => mergeWidgetsLocal(previous, nonPortfolioWidgets))
        setHighlight(nonPortfolioWidgets.map((widget) => widget.id))
      }

      const assistantMessage: AgentMessage = {
        id: uid('msg'),
        role: 'assistant',
        text: response.reply || 'Done.',
        sources: (response.sources || []) as any,
      }

      setMessages((previous) => previous.filter((message) => message.id !== typingId).concat(assistantMessage))
      return response
    } catch (error: any) {
      setMessages((previous) =>
        previous
          .filter((message) => !(message as any).typing)
          .concat({ id: uid('msg'), role: 'assistant', text: `Sorry, I hit an error contacting the API. ${error?.message || ''}` }),
      )
      throw error
    } finally {
      scheduleScrollToBottom()
    }
  }, [conversationId, ensurePortfolioPanel, llmModel, mergeWidgetsLocal, scheduleScrollToBottom, setHighlight, storageKey, walletAddress])

  const send = useCallback(async () => {
    const question = input.trim()
    if (!question) return
    setInput('')
    try {
      await sendPrompt(question)
    } catch {
      // Errors already rendered via chat messages
    }
  }, [input, sendPrompt])

  const requestBridgeQuoteRefresh = useCallback(async () => {
    try {
      await sendPrompt('refresh bridge quote')
    } catch {
      // ignore follow-up errors; surfaced in chat
    }
  }, [sendPrompt])

  const requestSwapQuoteRefresh = useCallback(async () => {
    try {
      await sendPrompt('refresh swap quote')
    } catch {
      // ignore follow-up errors
    }
  }, [sendPrompt])

  const handleStartNewChat = useCallback(async () => {
    try {
      if (walletAddress) {
        const response = await api.createConversation(walletAddress)
        const newId = response?.conversation_id
        if (newId) {
          setConversationId(newId)
          try {
            localStorage.setItem(storageKey(walletAddress), newId)
          } catch {
            // ignore
          }
        }
      } else {
        setConversationId(undefined)
        try {
          localStorage.removeItem(storageKey(null))
        } catch {
          // ignore
        }
      }
    } catch {
      setConversationId(undefined)
    }

    setMessages(seedIntro)
    setWidgets(seedWidgets)
    setHighlight(undefined)
    resetPanelUI()
  }, [resetPanelUI, setHighlight, storageKey, walletAddress])

  const handleRelayExecution = useCallback(async (widget: Widget) => {
    const payload = widget.payload || {}
    const quoteType = typeof payload.quote_type === 'string'
      ? payload.quote_type.toLowerCase()
      : widget.id === 'relay_swap_quote'
        ? 'swap'
        : 'bridge'

    const isSwapQuote = quoteType === 'swap'
    const actionVerb = isSwapQuote ? 'swap' : 'bridge'
    const refreshFn = isSwapQuote ? requestSwapQuoteRefresh : requestBridgeQuoteRefresh

    if (!walletClient) {
      throw new Error(`Connect a wallet to ${actionVerb}.`)
    }

    const tx = payload.tx
    if (!tx) throw new Error(`${isSwapQuote ? 'Swap' : 'Bridge'} transaction not available; ask for a new quote.`)

    const quoteWallet: string | undefined = typeof payload.wallet?.address === 'string' ? payload.wallet.address : undefined
    if (!quoteWallet) throw new Error('Quote is missing the wallet address.')

    const accountAddress = (walletClient.account?.address ?? quoteWallet) as `0x${string}`

    const resolveExpiryMs = (input: any): number | undefined => {
      if (!input) return undefined
      if (typeof input === 'string') {
        const parsed = Date.parse(input)
        return Number.isNaN(parsed) ? undefined : parsed
      }
      const iso = input.iso || input.ISO
      if (iso) {
        const parsed = Date.parse(String(iso))
        if (!Number.isNaN(parsed)) return parsed
      }
      const epoch = input.epoch ?? input.EPOCH
      if (typeof epoch !== 'undefined') {
        const epochNum = Number(epoch)
        if (Number.isFinite(epochNum)) {
          return epochNum > 1e12 ? epochNum : epochNum * 1000
        }
      }
      return undefined
    }

    const expiryMs = resolveExpiryMs(payload.quote_expiry)
    if (typeof expiryMs === 'number' && expiryMs <= Date.now()) {
      await refreshFn()
      throw new Error(`Quote expired. Requested a fresh ${actionVerb} quote.`)
    }

    const connectedAddress = walletClient.account?.address
    if (connectedAddress && connectedAddress.toLowerCase() !== quoteWallet.toLowerCase()) {
      throw new Error('Connected wallet does not match the quote wallet.')
    }

    const ensureBigInt = (value: any): bigint | undefined => {
      if (typeof value === 'bigint') return value
      if (typeof value === 'string' && value.trim().length) {
        try { return BigInt(value) } catch { return undefined }
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return BigInt(Math.trunc(value))
      }
      return undefined
    }

    const desiredChainId = typeof tx.chainId === 'number' ? tx.chainId : Number(tx.chainId ?? walletClient.chain?.id ?? 0)
    if (desiredChainId && walletClient.chain && walletClient.chain.id !== desiredChainId && switchChainAsync) {
      await switchChainAsync({ chainId: desiredChainId }).catch(() => {
        throw new Error(`Switch your wallet to chain ID ${desiredChainId} to continue.`)
      })
    }

    const rawInputAmount = payload.amounts?.input_amount_wei ?? payload.amounts?.input_base_units ?? tx.value ?? 0
    const inputAmountWei = ensureBigInt(rawInputAmount)
    const inputTokenAddress: string | undefined = payload.breakdown?.input?.token_address
    const inputTokenSymbol = typeof payload.breakdown?.input?.symbol === 'string'
      ? payload.breakdown.input.symbol.toUpperCase()
      : undefined

    const request: any = {
      account: walletClient.account ?? accountAddress,
      to: tx.to,
      data: tx.data,
    }

    if (!request.to || !request.data) throw new Error('Quote is missing transaction call data.')

    const gasLike = tx.gas ?? tx.gasLimit
    const gasValue = ensureBigInt(gasLike)
    if (typeof gasValue !== 'undefined') request.gas = gasValue

    const valueBig = ensureBigInt(tx.value)
    if (typeof valueBig !== 'undefined') request.value = valueBig

    if (typeof tx.chainId !== 'undefined' && tx.chainId !== null) {
      request.chainId = Number(tx.chainId)
    }

    if (typeof tx.maxFeePerGas !== 'undefined') {
      const parsed = ensureBigInt(tx.maxFeePerGas)
      if (typeof parsed !== 'undefined') request.maxFeePerGas = parsed
    }

    if (typeof tx.maxPriorityFeePerGas !== 'undefined') {
      const parsed = ensureBigInt(tx.maxPriorityFeePerGas)
      if (typeof parsed !== 'undefined') request.maxPriorityFeePerGas = parsed
    }

    if (typeof tx.nonce !== 'undefined') {
      request.nonce = tx.nonce
    }

    try {
      if (inputTokenAddress && inputAmountWei && inputAmountWei > 0n) {
        const wethLike = inputTokenSymbol === 'WETH'
        if (wethLike) {
          const executeWrap = async (value: bigint) => {
            await walletClient.writeContract({
              address: inputTokenAddress as `0x${string}`,
              abi: WETH_ABI,
              functionName: 'deposit',
              args: [],
              account: walletClient.account ?? accountAddress,
              chain: walletClient.chain,
              value,
            })
          }

          if (publicClient) {
            try {
              const balance = await publicClient.readContract({
                address: inputTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [accountAddress],
              }) as bigint
              const deficit = balance < inputAmountWei ? inputAmountWei - balance : 0n
              if (deficit > 0n) {
                await executeWrap(deficit)
              }
            } catch (wrapError) {
              console.warn('WETH balance check failed, attempting full wrap', wrapError)
              await executeWrap(inputAmountWei)
            }
          } else {
            console.warn('Public client unavailable; wrapping full WETH amount without balance check')
            await executeWrap(inputAmountWei)
          }
        }
      }

      const approvalData = payload.approval_data
      if (approvalData) {
        const approveAmount = ensureBigInt(approvalData.amount)
        if (typeof approveAmount === 'undefined') {
          throw new Error(`Approval amount from ${actionVerb} quote is invalid.`)
        }
        await walletClient.writeContract({
          address: approvalData.tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [approvalData.spenderAddress as `0x${string}`, approveAmount],
          account: walletClient.account ?? accountAddress,
          chain: walletClient.chain,
        })
      }

      const hash = await walletClient.sendTransaction(request)
      return hash as string
    } catch (error: any) {
      await refreshFn()
      const message = error?.shortMessage || error?.message || `Wallet rejected the ${actionVerb} transaction.`
      throw new Error(message)
    }
  }, [publicClient, requestBridgeQuoteRefresh, requestSwapQuoteRefresh, switchChainAsync, walletClient])

  const toggleCollapse = useCallback((id: string) => {
    dispatch({ type: 'togglePanelCollapse', panelId: id })
  }, [dispatch])

  const moveWidgetPosition = useCallback((id: string, direction: 'up' | 'down') => {
    setWidgets((previous) => moveWidgetInList(previous, id, direction))
  }, [])

  const handleAction = useCallback((action: AgentAction) => {
    if (action.gated === 'pro' && !pro) {
      handleProUpsell('action')
      const contractLine = proTokenAddress ? `Contract: ${proTokenAddress}` : ''
      const info = [proRequirement, contractLine].filter(Boolean).join('\n')
      setMessages((previous) => [
        ...previous,
        {
          id: uid('msg'),
          role: 'assistant',
          text: info || 'Sherpa Pro is token-gated. Hold the entitlement asset to unlock.',
          actions: [{ id: uid('act'), label: 'View Pro requirements', type: 'subscribe' }],
        },
      ])
      scheduleScrollToBottom()
      return
    }

    switch (action.type) {
      case 'show_panel': {
        const panelId = action.params?.panel_id
        if (panelId === 'portfolio_overview' && !walletAddress) {
          setMessages((previous) => [
            ...previous,
            { id: uid('msg'), role: 'assistant', text: 'Please connect your wallet to view your portfolio.' },
          ])
          break
        }
        if (panelId === 'top_coins') {
          loadTopCoinsPanel().catch(() => {})
          break
        }
        if (panelId === 'trending_tokens') {
          loadTrendingTokensPanel({ highlight: true }).catch(() => {})
          break
        }
        if (panelId === 'portfolio_overview' && walletAddress) {
          openPortfolioWorkspace(true)
          break
        }
        setHighlight(panelId ? [panelId] : undefined)
        if (panelId) {
          setMessages((previous) => [
            ...previous,
            { id: uid('msg'), role: 'assistant', text: `Opened: ${panelId}` },
          ])
        }
        break
      }
      case 'simulate':
        setShowSim({ from: action.params?.from, to: action.params?.to })
        break
      case 'swap':
        setShowSwap({ from: action.params?.from, to: action.params?.to })
        break
      case 'bridge':
        setShowBridge(true)
        break
      case 'explain':
        setMessages((previous) => [
          ...previous,
          { id: uid('msg'), role: 'assistant', text: 'Here’s a concise explanation with pros/cons and a quick checklist…' },
        ])
        break
      case 'subscribe':
        handleProUpsell('action')
        break
    }

    scheduleScrollToBottom()
  }, [handleProUpsell, loadTopCoinsPanel, loadTrendingTokensPanel, openPortfolioWorkspace, pro, proRequirement, proTokenAddress, scheduleScrollToBottom, setHighlight, setMessages, setShowBridge, setShowSim, setShowSwap, walletAddress])

  const hasWidgets = widgets.length > 0
  const workspaceButtonLabel = hasWidgets ? `Workspace (${widgets.length})` : 'Workspace'
  const conversationDisplay = conversationId ? `${conversationId.slice(0, 10)}…` : 'Draft session'

  const headerProps: HeaderBarProps = {
    persona,
    walletLabel: walletAddress ? truncateAddress(walletAddress) : 'Guest session',
    walletConnected: Boolean(walletAddress),
    proLabel: proBadgeLabel,
    onPersonaChange: setPersona,
    onNewChat: handleStartNewChat,
    onPlanWorkflow: () => handleInsertQuickPrompt('Outline the next best DeFi workflow for my wallet.'),
    onShowTrending: () => {
      loadTrendingTokensPanel({ highlight: true }).catch(() => {})
      setActiveSurface('workspace')
    },
    onOpenWorkspace: () => setActiveSurface('workspace'),
  }

  const railChip = walletAddress ? (
    <PortfolioRailChip
      summary={portfolioSummary ?? null}
      status={portfolioStatus}
      refreshing={portfolioRefreshing}
      onOpenWorkspace={() => openPortfolioWorkspace(false)}
      onRefresh={() => onRefreshPortfolio().catch(() => {})}
    />
  ) : null

  const chatSurfaceProps: ChatSurfaceProps = {
    containerRef: scrollRef,
    inputRef,
    messages,
    onAction: handleAction,
    isAssistantTyping,
    prefersReducedMotion,
    ariaAnnouncement,
    inputValue: input,
    onInputChange: setInput,
    onSend: () => { void send() },
    proBadgeLabel,
    pro,
    showProInfo,
    onDismissProInfo: () => {
      setShowProInfo(false)
      setCopiedToken(false)
    },
    onProUpsell: handleProUpsell,
    manualUnlockAvailable,
    onManualUnlock: onManualUnlock ?? (() => {}),
    proRequirement,
    proTokenAddress,
    proContractDisplay,
    proExplorerUrl,
    copiedToken,
    onCopyToken: handleCopyToken,
  }

  const workspaceSurfaceProps: WorkspaceSurfaceProps = {
    widgets,
    highlight,
    panelUI,
    walletAddress,
    walletReady,
    portfolioStatus,
    portfolioError: portfolioError ?? undefined,
    portfolioRefreshing,
    onToggleCollapse: toggleCollapse,
    onExpand: (id) => setExpandedPanelId(id),
    onMove: moveWidgetPosition,
    onBridge: handleRelayExecution,
    onSwap: handleRelayExecution,
    onRefreshBridgeQuote: requestBridgeQuoteRefresh,
    onRefreshSwapQuote: requestSwapQuoteRefresh,
    onInsertQuickPrompt: handleInsertQuickPrompt,
    onLoadTopCoins: () => {
      loadTopCoinsPanel().catch(() => {})
      setActiveSurface('workspace')
    },
    onOpenPortfolio: () => openPortfolioWorkspace(true),
    onOpenRelayQuote: () => {
      setShowRelay(true)
      setActiveSurface('workspace')
    },
    onExplainProtocol: () => handleInsertQuickPrompt('Explain this protocol like a playbook I can follow.'),
    showCoachMark: widgets.length > 0 && !coachMarkDismissed,
    onDismissCoachMark: dismissCoachMark,
  }

  const modals = (
    <>
      {showSim && (
        <SimulateModal
          from={showSim.from}
          to={showSim.to}
          onClose={() => setShowSim(null)}
          onConfirm={async (pct, amount) => {
            const fromSym = showSim.from || 'ETH'
            const toSym = showSim.to || 'USDC'
            const amt = amount && amount > 0 ? amount : 1
            setShowSim(null)
            const quote = await getSwapQuote({ token_in: fromSym, token_out: toSym, amount_in: amt, slippage_bps: 50 })
            const feeStr = quote ? `$${quote.fee_est.toFixed(2)} est. fee` : 'fee est. unavailable'
            const outStr = quote ? `${quote.amount_out_est.toFixed(6)} ${toSym}` : '—'
            const slipStr = quote ? `${quote.slippage_bps} bps slippage reserve` : ''
            const basis = amount && amount > 0 ? '' : ' (based on 1 unit)'
            const warn = quote && quote.warnings?.length ? `\nNote: ${quote.warnings.join('; ')}` : ''
            const text = `Simulated swap: ${amt} ${fromSym} → ~${outStr}.${basis}\n${feeStr}; ${slipStr}.${warn}`
            setMessages((previous) => [
              ...previous,
              {
                id: uid('msg'),
                role: 'assistant',
                text,
                actions: [
                  {
                    id: uid('act'),
                    label: 'Proceed swap',
                    type: 'swap',
                    params: { from: fromSym, to: toSym, amount: amt },
                  },
                ],
              },
            ])
          }}
        />
      )}
      {showSwap && (
        <SwapModal
          from={showSwap.from}
          to={showSwap.to}
          onClose={() => setShowSwap(null)}
          onConfirm={(params) => {
            setShowSwap(null)
            setMessages((previous) => [
              ...previous,
              {
                id: uid('msg'),
                role: 'assistant',
                text: `Opening wallet to swap ${params.amount ?? ''} ${params.from} → ${params.to}.`,
              },
            ])
          }}
        />
      )}
      {showBridge && (
        <BridgeModal
          onClose={() => setShowBridge(false)}
          onConfirm={(params) => {
            setShowBridge(false)
            setMessages((previous) => [
              ...previous,
              {
                id: uid('msg'),
                role: 'assistant',
                text: `Bridge setup: ${params.fromChain} → ${params.toChain}${params.amount ? `, amount ${params.amount}` : ''}.`,
              },
            ])
          }}
        />
      )}
      {showRelay && <RelayQuoteModal onClose={() => setShowRelay(false)} />}
      {expandedPanelId && (
        <ExpandedPanelModal
          widget={widgets.find((widget) => widget.id === expandedPanelId)}
          onClose={() => setExpandedPanelId(null)}
          walletAddress={walletAddress}
          walletReady={walletReady}
          onBridge={handleRelayExecution}
          onSwap={handleRelayExecution}
          onRefreshBridgeQuote={requestBridgeQuoteRefresh}
          onRefreshSwapQuote={requestSwapQuoteRefresh}
          onInsertQuickPrompt={handleInsertQuickPrompt}
        />
      )}
    </>
  )

  return {
    headerProps,
    chatSurfaceProps,
    workspaceSurfaceProps,
    surface: {
      active: activeSurface,
      workspaceLabel: workspaceButtonLabel,
      conversationLabel: conversationDisplay,
      onSurfaceChange: setActiveSurface,
      portfolioChip: railChip,
    },
    modals,
    helpers: {
      scrollRef,
      inputRef,
      prefersReducedMotion,
    },
  }
}
