import { render, screen } from '@testing-library/react'
import { App } from '../App'
import { Web3Provider } from '../providers/Web3Provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('App', () => {
  it('renders header', () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <Web3Provider>
          <App />
        </Web3Provider>
      </QueryClientProvider>
    )
    expect(screen.getByText('Agentic Wallet')).toBeInTheDocument()
  })
})
