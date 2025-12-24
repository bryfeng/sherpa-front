import { useCallback, useMemo } from 'react'
import type { Widget } from '../../types/widgets'

export interface QuickAction {
  id: string
  icon: 'refresh' | 'copy' | 'share'
  label: string
  ariaLabel: string
  onClick: () => void
}

export interface UseQuickActionsOptions {
  widget: Widget
  onRefresh?: () => void
  onCopy?: () => void
  onShare?: () => void
}

export function useQuickActions({
  widget,
  onRefresh,
  onCopy,
  onShare,
}: UseQuickActionsOptions): QuickAction[] {
  const handleCopy = useCallback(async () => {
    if (onCopy) {
      onCopy()
      return
    }
    const payload = widget.payload as any
    let textToCopy = ''

    switch (widget.kind) {
      case 'chart':
        if (payload?.series?.prices?.length) {
          const latest = payload.series.prices[payload.series.prices.length - 1]
          textToCopy = `${widget.title}: $${latest?.[1]?.toFixed(2) ?? 'N/A'}`
        } else {
          textToCopy = widget.title
        }
        break
      case 'portfolio':
        textToCopy = `Portfolio: ${payload?.totalUsd ? `$${payload.totalUsd.toLocaleString()}` : 'N/A'}`
        break
      case 'prices':
        if (payload?.coins?.length) {
          textToCopy = payload.coins
            .slice(0, 5)
            .map((c: any) => `${c.symbol}: $${c.price?.toFixed(2)}`)
            .join('\n')
        }
        break
      case 'trending':
        if (payload?.tokens?.length) {
          textToCopy = payload.tokens
            .slice(0, 5)
            .map((t: any) => t.symbol || t.name)
            .join(', ')
        }
        break
      default:
        textToCopy = widget.title
    }

    try {
      await navigator.clipboard?.writeText(textToCopy)
    } catch {
      // Ignore clipboard errors
    }
  }, [widget, onCopy])

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare()
      return
    }

    const shareData = {
      title: widget.title,
      text: `Check out this ${widget.kind} from Sherpa`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard?.writeText(shareData.url)
      }
    } catch {
      // Ignore share errors (user may have cancelled)
    }
  }, [widget, onShare])

  return useMemo(() => {
    const actions: QuickAction[] = []

    if (onRefresh) {
      actions.push({
        id: `refresh-${widget.id}`,
        icon: 'refresh',
        label: 'Refresh',
        ariaLabel: `Refresh ${widget.title}`,
        onClick: onRefresh,
      })
    }

    actions.push({
      id: `copy-${widget.id}`,
      icon: 'copy',
      label: 'Copy',
      ariaLabel: `Copy ${widget.title} data`,
      onClick: handleCopy,
    })

    actions.push({
      id: `share-${widget.id}`,
      icon: 'share',
      label: 'Share',
      ariaLabel: `Share ${widget.title}`,
      onClick: handleShare,
    })

    return actions
  }, [widget.id, widget.title, onRefresh, handleCopy, handleShare])
}
