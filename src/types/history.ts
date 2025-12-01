export type HistorySummaryBucket = {
  start: string
  end: string
  inflow: number
  outflow: number
  inflowUsd: number
  outflowUsd: number
  feeUsd: number
  transactionsSample: Array<{
    timestamp: string
    symbol: string
    direction: 'inflow' | 'outflow'
    usd_value?: number
    tx_hash: string
  }>
}

export type HistoryExportRef = {
  exportId: string
  format: 'csv' | 'json'
  status: 'pending' | 'ready' | 'failed' | 'queued'
  downloadUrl?: string | null
  createdAt: string
  expiresAt: string
  error?: string | null
}

export type HistorySummaryMetadata = {
  sampleLimit?: number
  windowClamped?: boolean
  requestedWindow?: { start: string; end: string }
  requestedWindowDays?: number
  syncWindowDays?: number
  clampedWindowDays?: number
  queuedReason?: 'window' | 'limit'
  queuedExportId?: string
  retryAfterSeconds?: number
}

export type HistorySummaryResponse = {
  walletAddress: string
  chain: string
  timeWindow: { start: string; end: string }
  bucketSize: 'day' | 'week'
  totals: {
    inflow: number
    outflow: number
    inflowUsd: number
    outflowUsd: number
    feeUsd: number
  }
  notableEvents: Array<{ type: string; severity: 'info' | 'warning' | 'critical'; summary: string }>
  buckets: HistorySummaryBucket[]
  exportRefs: HistoryExportRef[]
  generatedAt: string
  cached?: boolean
  metadata?: HistorySummaryMetadata
}

export type HistoryComparisonReport = {
  baselineWindow: { start: string; end: string }
  comparisonWindow: { start: string; end: string }
  metricDeltas: Array<{
    metric: string
    baselineValueUsd?: number
    comparisonValueUsd?: number
    deltaPct?: number | null
    direction: 'up' | 'down' | 'flat'
  }>
  thresholdFlags: Array<{ metric: string; direction: 'up' | 'down' | 'flat'; magnitudePct: number }>
  supportingTables: Array<{
    name: string
    baseline: Array<{ name: string; usd: number }>
    comparison: Array<{ name: string; usd: number }>
  }>
}
