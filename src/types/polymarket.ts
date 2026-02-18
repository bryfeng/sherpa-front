/**
 * Polymarket prediction market types.
 * Mirrors backend API response shapes from /polymarket/* endpoints.
 */

export interface PolymarketMarket {
  marketId: string
  question: string
  description: string
  outcomes: string[]
  prices: Record<string, number>
  volumeUsd: number
  volume24hUsd: number
  liquidityUsd: number
  endDate: string | null
  active: boolean
  resolved: boolean
  tags: string[]
}

export interface PolymarketOrderbookDepth {
  bestBid: number | null
  bestAsk: number | null
  spread: number | null
  bidLevels: number
  askLevels: number
}

export interface PolymarketMarketDetail {
  market: PolymarketMarket
  orderbookDepth: Record<string, PolymarketOrderbookDepth>
}

export interface PolymarketAnalysis {
  marketId: string
  question: string
  currentYesPrice: number
  currentNoPrice: number
  summary: string
  keyFactors: string[]
  sentiment: string
  confidence: number
  volumeTrend: string
  recommendedSide: string | null
  recommendedReason: string | null
  analyzedAt: string
}

export interface PolymarketPosition {
  marketId: string
  marketQuestion: string
  outcome: string
  shares: number
  avgPrice: number
  currentPrice: number
  valueUsd: number
  costBasisUsd: number
  pnlUsd: number
  pnlPct: number | null
}

export interface PolymarketPortfolio {
  address: string
  totalValueUsd: number
  totalCostBasisUsd: number
  totalPnlUsd: number
  totalPnlPct: number | null
  openPositions: number
  winningPositions: number
  losingPositions: number
  positions: PolymarketPosition[]
}

export interface PolymarketLeaderboardEntry {
  rank: number
  address: string
  totalPnlUsd: number
  roiPct: number
  winRate: number
  totalVolumeUsd: number
  activePositions: number
  totalTrades: number
  followerCount: number
}

export interface PolymarketCategory {
  id: string
  name: string
  description: string
}
