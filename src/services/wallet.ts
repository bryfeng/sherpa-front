export async function connectWallet(): Promise<string | null> {
  const eth = (window as any).ethereum
  if (!eth || !eth.request) return null
  try {
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts.length > 0) return accounts[0]
    return null
  } catch (e) {
    return null
  }
}

export function truncateAddress(addr: string, size = 4) {
  return addr ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : ''
}

