import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export async function getUniswapTVL(range: '7d' | '30d' = '7d'): Promise<number[] | null> {
  try {
    const { data } = await axios.get(`${BASE}/tools/defillama/tvl`, { params: { protocol: 'uniswap', range } })
    if (Array.isArray(data?.tvl)) return data.tvl as number[]
    if (Array.isArray(data?.series)) return data.series as number[]
    return null
  } catch {
    return null
  }
}

