import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type TVLPoint = { time: number; tvl: number }

export async function getUniswapTVL(range: '7d' | '30d' = '7d'): Promise<TVLPoint[] | null> {
  try {
    const { data } = await axios.get(`${BASE}/tools/defillama/tvl`, { params: { protocol: 'uniswap', range } })
    const ts: number[] | undefined = Array.isArray(data?.timestamps) ? data.timestamps : undefined
    const tvl: number[] | undefined = Array.isArray(data?.tvl) ? data.tvl : Array.isArray(data?.series) ? data.series : undefined
    if (!tvl) return null
    if (ts && ts.length === tvl.length) {
      return tvl.map((v: number, i: number) => ({ time: ts[i], tvl: v }))
    }
    // Fallback: synthesize time indexes
    const now = Date.now()
    const step = 24 * 60 * 60 * 1000
    const start = now - (tvl.length - 1) * step
    return tvl.map((v: number, i: number) => ({ time: start + i * step, tvl: v }))
  } catch {
    return null
  }
}

