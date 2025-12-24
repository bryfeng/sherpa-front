import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { WorkspaceSurface, type WorkspaceSurfaceProps } from '../components/surfaces/WorkspaceSurface'

function renderWorkspaceSurface(overrides: Partial<WorkspaceSurfaceProps> = {}) {
  const props: WorkspaceSurfaceProps = {
    widgets: [],
    highlight: undefined,
    panelUI: {},
    walletAddress: undefined,
    walletReady: false,
    portfolioStatus: 'idle',
    portfolioError: undefined,
    portfolioRefreshing: false,
    onToggleCollapse: vi.fn(),
    onExpand: vi.fn(),
    onReorder: vi.fn(),
    onBridge: vi.fn(),
    onSwap: vi.fn(),
    onRefreshBridgeQuote: vi.fn(),
    onRefreshSwapQuote: vi.fn(),
    onInsertQuickPrompt: vi.fn(),
    onLoadTopCoins: vi.fn(),
    onOpenPortfolio: vi.fn(),
    onOpenRelayQuote: vi.fn(),
    onExplainProtocol: vi.fn(),
    ...overrides,
  }
  return render(<WorkspaceSurface {...props} />)
}

describe('WorkspaceSurface', () => {
  it('renders empty state when no panels', () => {
    renderWorkspaceSurface()
    expect(screen.getByText(/No workspace panels yet/i)).toBeInTheDocument()
  })
})
