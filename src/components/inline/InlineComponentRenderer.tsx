/**
 * INLINE COMPONENT RENDERER
 *
 * Dispatches inline components to their appropriate widget content.
 * Wraps each component in a clean InlineCard wrapper.
 */

import React from 'react'
import type { InlineComponent } from '../../types/defi-ui'
import type { PortfolioPositionViewModel } from '../../workspace/types'
import { InlineCard } from './InlineCard'
import { EnhancedPortfolioCard } from '../portfolio'
import {
  PriceTickerWidget,
  PriceChartWidget,
  SwapWidget,
} from '../widgets/WidgetContents'

interface InlineComponentRendererProps {
  component: InlineComponent
  walletAddress?: string
  isPro?: boolean
}

/**
 * Renders an inline component based on its kind.
 * Wraps the content in an InlineCard with appropriate styling.
 */
export function InlineComponentRenderer({
  component,
  walletAddress,
  isPro = false,
}: InlineComponentRendererProps) {
  const { kind, payload, variant = 'standard', title } = component

  switch (kind) {
    case 'portfolio-card':
      // Use address from payload if available, otherwise fall back to connected wallet
      const portfolioAddress = payload?.address || payload?.wallet_address || walletAddress
      return (
        <InlineCard variant={variant} title={title || 'Portfolio'}>
          <EnhancedPortfolioCard
            walletAddress={portfolioAddress}
            chain={payload?.chain || 'ethereum'}
            onTokenAction={(action, token) => {
              // TODO: Handle token actions (swap, send, chart)
              console.log('Token action:', action, token)
            }}
          />
        </InlineCard>
      )

    case 'swap-form':
      return (
        <InlineCard variant="expanded" title={title || 'Swap'}>
          <SwapWidget walletAddress={walletAddress} />
        </InlineCard>
      )

    case 'price-chart':
      return (
        <InlineCard variant={variant || 'expanded'} title={title || payload?.symbol || 'Chart'}>
          <PriceChartWidget symbol={payload?.symbol || 'ETH'} />
        </InlineCard>
      )

    case 'token-list':
      return (
        <InlineCard variant={variant} title={title || 'Prices'}>
          <PriceTickerWidget
            tokens={payload?.tokens}
            limit={payload?.limit || 5}
          />
        </InlineCard>
      )

    case 'action-card':
      return (
        <InlineCard variant="compact" title={title || 'Action'}>
          <ActionCardContent action={payload?.action} params={payload?.params} />
        </InlineCard>
      )

    default:
      // Unknown component type - render a placeholder
      return (
        <InlineCard variant="compact" title={title || 'Unknown'}>
          <div
            className="text-center py-4"
            style={{ color: 'var(--text-muted)' }}
          >
            <p className="text-sm">Unknown component type: {kind}</p>
          </div>
        </InlineCard>
      )
  }
}

/**
 * Simple action card content for quick actions
 */
function ActionCardContent({
  action,
  params,
}: {
  action?: string
  params?: Record<string, any>
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--text)' }}>
        {action || 'Action'}
      </span>
      <button
        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: 'var(--accent)',
          color: 'var(--text-inverse)',
        }}
      >
        Execute
      </button>
    </div>
  )
}

export default InlineComponentRenderer
