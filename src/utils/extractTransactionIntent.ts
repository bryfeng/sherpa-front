import type { TransactionIntent } from '../types/policy'
import type { Widget } from '../types/widgets'

/**
 * Extracts a TransactionIntent from a RelayQuoteWidget payload
 * for policy evaluation purposes.
 */
export function extractTransactionIntent(
  panel: Widget,
): TransactionIntent | null {
  const payload = panel.payload || {}

  // Determine transaction type from quote_type or panel.id
  const quoteType =
    typeof payload.quote_type === 'string'
      ? payload.quote_type.toLowerCase()
      : panel.id === 'relay_swap_quote'
        ? 'swap'
        : 'bridge'

  const type: 'swap' | 'bridge' | 'transfer' =
    quoteType === 'swap' ? 'swap' : quoteType === 'bridge' ? 'bridge' : 'transfer'

  // Extract input token info
  const inputToken = payload.input || payload.from || {}
  const fromToken = {
    address: String(inputToken.address || inputToken.token?.address || ''),
    symbol: String(inputToken.symbol || inputToken.token?.symbol || 'UNKNOWN'),
    chainId: Number(inputToken.chainId || inputToken.chain_id || payload.chainId || payload.chain_id || 1),
  }

  // Extract output token info
  const outputToken = payload.output || payload.to || {}
  const breakdown = payload.breakdown || {}
  const outputSection = breakdown.output || {}
  const toToken = {
    address: String(outputToken.address || outputToken.token?.address || ''),
    symbol: String(outputSection.symbol || outputToken.symbol || outputToken.token?.symbol || 'UNKNOWN'),
    chainId: Number(
      outputToken.chainId ||
        outputToken.chain_id ||
        (type === 'bridge' ? payload.destinationChainId || payload.destination_chain_id : fromToken.chainId) ||
        fromToken.chainId,
    ),
  }

  // Extract USD amount (use input value or output value)
  const usdEstimates = payload.usd_estimates || {}
  const inputUsd = parseNumeric(usdEstimates.input || inputToken.value_usd || inputToken.usd_value)
  const outputUsd = parseNumeric(usdEstimates.output || outputSection.value_usd || outputToken.value_usd)
  const amountUsd = inputUsd || outputUsd || 0

  // Extract fees
  const fees = breakdown.fees || payload.fees || {}
  const slippagePercent = parseNumeric(fees.slippage_percent || fees.slippage || payload.slippage) || 0.5
  const gasEstimateUsd = parseNumeric(usdEstimates.gas || fees.gas_usd || fees.gas) || 0

  // Extract contract address if available
  const tx = payload.tx || {}
  const contractAddress = typeof tx.to === 'string' ? tx.to : undefined

  // Validate we have minimum required data
  if (amountUsd === 0 && !fromToken.address && !toToken.address) {
    return null
  }

  return {
    type,
    fromToken,
    toToken,
    amountUsd,
    slippagePercent,
    gasEstimateUsd,
    contractAddress,
  }
}

/**
 * Helper to parse a numeric value from various formats
 */
function parseNumeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,$%]/g, '').trim()
    const parsed = Number(cleaned)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}
