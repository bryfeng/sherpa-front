import axios from 'axios'
import type { Widget } from '../types/widgets'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type RelayQuoteResponse = {
  success: boolean
  quote: any
}

export async function getRelayQuote(payload: Record<string, any>): Promise<any | null> {
  try {
    const { data } = await axios.post<RelayQuoteResponse>(`${BASE}/tools/relay/quote`, payload)
    return data?.quote ?? null
  } catch (error) {
    console.error('Relay quote failed', error)
    return null
  }
}

export async function getRelaySignature(requestId: string): Promise<any | null> {
  if (!requestId) return null
  try {
    const { data } = await axios.get(`${BASE}/tools/relay/requests/${requestId}/signature`)
    return data?.signature ?? null
  } catch (error) {
    console.error('Relay signature fetch failed', error)
    return null
  }
}

// ============================================
// DIRECT QUOTE REFRESH (bypasses chat/LLM)
// ============================================

interface RelayRefreshParams {
  user: string
  originChainId: number
  destinationChainId: number
  originCurrency: string
  destinationCurrency: string
  recipient: string
  amount: string
  tradeType?: string
  slippageTolerance?: string
}

/**
 * Extract refresh parameters from a Relay quote widget payload
 */
export function extractRelayRefreshParams(widget: Widget): RelayRefreshParams | null {
  const payload = widget.payload || {}

  // Get wallet address
  const walletAddress = payload.wallet?.address
  if (!walletAddress || typeof walletAddress !== 'string') {
    console.warn('[relay] Cannot refresh: missing wallet address')
    return null
  }

  // Determine if this is a bridge or swap
  const quoteType = typeof payload.quote_type === 'string'
    ? payload.quote_type.toLowerCase()
    : widget.id === 'relay_swap_quote'
      ? 'swap'
      : 'bridge'

  const isBridge = quoteType === 'bridge'

  // Extract input token info
  const input = payload.input || payload.from || {}
  const inputAddress = input.address || input.token?.address
  const inputChainId = input.chainId || input.chain_id || payload.chainId || payload.chain_id

  if (!inputAddress || !inputChainId) {
    console.warn('[relay] Cannot refresh: missing input token info', { inputAddress, inputChainId })
    return null
  }

  // Extract output token info
  const output = payload.output || payload.to || {}
  const outputAddress = output.address || output.token?.address
  const outputChainId = isBridge
    ? (output.chainId || output.chain_id || payload.destinationChainId || payload.destination_chain_id)
    : inputChainId // Same chain for swaps

  if (!outputAddress) {
    console.warn('[relay] Cannot refresh: missing output token address')
    return null
  }

  // Extract amount - try multiple locations
  const amounts = payload.amounts || {}
  const rawAmount = amounts.input_amount_wei
    ?? amounts.input_base_units
    ?? payload.tx?.value
    ?? input.amount

  if (!rawAmount) {
    console.warn('[relay] Cannot refresh: missing amount')
    return null
  }

  // Convert amount to string
  const amount = typeof rawAmount === 'bigint'
    ? rawAmount.toString()
    : String(rawAmount)

  return {
    user: walletAddress,
    originChainId: Number(inputChainId),
    destinationChainId: Number(outputChainId),
    originCurrency: String(inputAddress),
    destinationCurrency: String(outputAddress),
    recipient: walletAddress,
    amount,
    tradeType: 'EXACT_INPUT',
  }
}

/**
 * Refresh a Relay quote directly without going through the chat.
 * Returns a partial payload to merge into the existing widget.
 */
export async function refreshRelayQuote(widget: Widget): Promise<Partial<Widget['payload']>> {
  const params = extractRelayRefreshParams(widget)

  if (!params) {
    throw new Error('Unable to extract quote parameters. Try requesting a new quote in chat.')
  }

  const quote = await getRelayQuote({
    ...params,
    referrer: 'sherpa.chat',
    useExternalLiquidity: true,
    useDepositAddress: false,
    topupGas: false,
  })

  if (!quote) {
    throw new Error('Failed to refresh quote from Relay')
  }

  // Build updated payload from Relay response
  const details = quote.details || {}
  const currencyIn = details.currencyIn || {}
  const currencyOut = details.currencyOut || {}

  // Extract transaction data from steps
  let tx: Record<string, any> | undefined
  const steps = quote.steps || []
  for (const step of steps) {
    const items = step.items || []
    for (const item of items) {
      if (item.data?.to && item.data?.data) {
        tx = {
          to: item.data.to,
          data: item.data.data,
          value: item.data.value || '0',
          chainId: params.originChainId,
        }
        break
      }
    }
    if (tx) break
  }

  return {
    status: 'ok',
    request_id: quote.requestId,
    quote_expiry: details.expiresAt ? { iso: details.expiresAt } : undefined,
    tx,
    amounts: {
      input_amount_wei: currencyIn.amount,
      output_amount_wei: currencyOut.amount,
    },
    breakdown: {
      input: {
        amount: currencyIn.amount,
        symbol: currencyIn.symbol,
        token_address: currencyIn.address,
      },
      output: {
        amount: currencyOut.amount,
        amount_estimate: currencyOut.amount,
        symbol: currencyOut.symbol,
        token_address: currencyOut.address,
        value_usd: currencyOut.amountUsd,
      },
      fees: {
        gas_usd: details.gasFeeUsd,
        relay_usd: details.relayFeeUsd,
        total_usd: details.totalFeeUsd,
      },
      eta_seconds: details.timeEstimate,
    },
    usd_estimates: {
      input: currencyIn.amountUsd,
      output: currencyOut.amountUsd,
      gas: details.gasFeeUsd,
    },
    approvals: quote.approvals,
    signatures: quote.signatures,
  }
}
