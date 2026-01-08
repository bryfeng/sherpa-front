import { describe, it, expect } from 'vitest'
import { extractTransactionIntent } from '../extractTransactionIntent'
import type { Widget } from '../../types/widgets'

describe('extractTransactionIntent', () => {
  it('extracts swap intent from relay quote payload', () => {
    const panel: Widget = {
      id: 'relay_swap_quote',
      kind: 'relay-quote',
      title: 'Swap Quote',
      density: 'full',
      payload: {
        quote_type: 'swap',
        input: {
          address: '0xUSDC',
          symbol: 'USDC',
          chainId: 1,
        },
        output: {
          address: '0xWETH',
          symbol: 'WETH',
          chainId: 1,
        },
        usd_estimates: {
          input: 1000,
          output: 995,
          gas: 5,
        },
        breakdown: {
          fees: {
            slippage_percent: 0.5,
          },
        },
        tx: {
          to: '0xRelayContract',
        },
      },
    }

    const intent = extractTransactionIntent(panel)

    expect(intent).not.toBeNull()
    expect(intent!.type).toBe('swap')
    expect(intent!.fromToken.symbol).toBe('USDC')
    expect(intent!.toToken.symbol).toBe('WETH')
    expect(intent!.amountUsd).toBe(1000)
    expect(intent!.slippagePercent).toBe(0.5)
    expect(intent!.gasEstimateUsd).toBe(5)
    expect(intent!.contractAddress).toBe('0xRelayContract')
  })

  it('extracts bridge intent from relay quote payload', () => {
    const panel: Widget = {
      id: 'relay_bridge_quote',
      kind: 'relay-quote',
      title: 'Bridge Quote',
      density: 'full',
      payload: {
        quote_type: 'bridge',
        input: {
          address: '0xUSDC',
          symbol: 'USDC',
          chainId: 1,
        },
        output: {
          address: '0xUSDC',
          symbol: 'USDC',
          chainId: 42161, // Arbitrum
        },
        usd_estimates: {
          input: 5000,
          output: 4990,
          gas: 10,
        },
        breakdown: {
          fees: {
            slippage_percent: 0.3,
          },
        },
      },
    }

    const intent = extractTransactionIntent(panel)

    expect(intent).not.toBeNull()
    expect(intent!.type).toBe('bridge')
    expect(intent!.fromToken.chainId).toBe(1)
    expect(intent!.toToken.chainId).toBe(42161)
    expect(intent!.amountUsd).toBe(5000)
  })

  it('returns null for empty payload', () => {
    const panel: Widget = {
      id: 'empty',
      kind: 'relay-quote',
      title: 'Empty',
      density: 'full',
      payload: {},
    }

    const intent = extractTransactionIntent(panel)
    expect(intent).toBeNull()
  })

  it('infers swap type from panel id when quote_type is missing', () => {
    const panel: Widget = {
      id: 'relay_swap_quote',
      kind: 'relay-quote',
      title: 'Swap',
      density: 'full',
      payload: {
        input: { symbol: 'ETH', address: '0x', chainId: 1 },
        output: { symbol: 'USDC', address: '0x', chainId: 1 },
        usd_estimates: { input: 100 },
      },
    }

    const intent = extractTransactionIntent(panel)
    expect(intent!.type).toBe('swap')
  })

  it('uses default slippage when not provided', () => {
    const panel: Widget = {
      id: 'test',
      kind: 'relay-quote',
      title: 'Test',
      density: 'full',
      payload: {
        input: { symbol: 'ETH', address: '0x', chainId: 1 },
        output: { symbol: 'USDC', address: '0x', chainId: 1 },
        usd_estimates: { input: 100 },
        breakdown: {},
      },
    }

    const intent = extractTransactionIntent(panel)
    expect(intent!.slippagePercent).toBe(0.5) // Default
  })

  it('handles string USD values', () => {
    const panel: Widget = {
      id: 'test',
      kind: 'relay-quote',
      title: 'Test',
      density: 'full',
      payload: {
        input: { symbol: 'ETH', address: '0x', chainId: 1 },
        output: { symbol: 'USDC', address: '0x', chainId: 1 },
        usd_estimates: { input: '$1,000.50' },
      },
    }

    const intent = extractTransactionIntent(panel)
    expect(intent!.amountUsd).toBe(1000.5)
  })
})
