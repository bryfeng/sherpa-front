export interface TokenHolding {
  symbol: string
  name: string
  balance_wei?: string
  balance_formatted?: string
  value_usd?: string | number
  price_usd?: string | number
  address?: string
}

export interface PortfolioData {
  address: string
  chain: string
  total_value_usd: string | number
  token_count: number
  tokens: TokenHolding[]
}

export interface PortfolioAPIResponse {
  success: boolean
  portfolio?: PortfolioData
  error?: string
  sources: any[]
}

