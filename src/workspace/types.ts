import type { PortfolioData } from '../types/portfolio'

export type WorkspaceRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PortfolioPositionViewModel {
  symbol: string
  sym: string
  name: string
  usd: number
  usdFormatted: string
  allocationPercent?: number
  balanceFormatted?: string
  address?: string
  network?: string
}

export interface PortfolioSummaryViewModel {
  totalUsd: number
  totalUsdFormatted: string
  tokenCount: number
  address?: string
  fetchedAt: string
  positions: PortfolioPositionViewModel[]
  allPositions: PortfolioPositionViewModel[]
  topPositions: PortfolioPositionViewModel[]
  sources?: Array<Record<string, any>>
  raw?: PortfolioData
}

export interface WorkspaceHookResult<T> {
  data: T | null
  status: WorkspaceRequestStatus
  error: string | null
  isFetching: boolean
  refresh: () => Promise<void>
  reset: () => void
}
