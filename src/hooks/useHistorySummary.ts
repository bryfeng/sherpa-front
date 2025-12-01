import { useMemo } from 'react'
import type { HistoryExportRef, HistorySummaryMetadata, HistorySummaryResponse } from '../types/history'

export function useHistorySummary(summary?: HistorySummaryResponse) {
  return useMemo(() => {
    const events = summary?.notableEvents ?? []
    const allExports = summary?.exportRefs ?? []
    const readyExports: HistoryExportRef[] = allExports.filter((ref) => ref.status === 'ready')
    const pendingExports: HistoryExportRef[] = allExports.filter((ref) => ref.status !== 'ready')
    const metadata: HistorySummaryMetadata = summary?.metadata ?? {}
    const limitCount = typeof metadata.sampleLimit === 'number' ? metadata.sampleLimit : null

    return {
      events,
      readyExports,
      pendingExports,
      hasHighlights: events.length > 0,
      hasExports: allExports.length > 0,
      nextDownloadUrl: readyExports[0]?.downloadUrl ?? null,
      metadata,
      isLimitSample: typeof metadata.sampleLimit === 'number',
      isWindowClamped: Boolean(metadata.windowClamped),
      limitCount,
      queueInfo: metadata.queuedExportId
        ? {
            exportId: metadata.queuedExportId,
            reason: metadata.queuedReason,
            retryAfterSeconds: metadata.retryAfterSeconds,
          }
        : null,
    }
  }, [summary])
}
