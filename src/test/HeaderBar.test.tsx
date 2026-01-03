import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { HeaderBar, type HeaderBarProps } from '../components/header/HeaderBar'

function renderHeaderBar(overrides: Partial<HeaderBarProps> = {}) {
  const props: HeaderBarProps = {
    persona: 'friendly',
    walletLabel: 'Guest session',
    walletConnected: false,
    proLabel: 'Pro Preview',
    onPersonaChange: vi.fn(),
    onNewChat: vi.fn(),
    menuActions: [],
    ...overrides,
  }
  return render(<HeaderBar {...props} />)
}

describe('HeaderBar', () => {
  it('renders persona badge and wallet label', () => {
    renderHeaderBar({ walletLabel: '0x1234' })
    expect(screen.getByText('Friendly')).toBeInTheDocument()
    expect(screen.getByText('0x1234')).toBeInTheDocument()
  })

  it('invokes persona change handler', () => {
    const onPersonaChange = vi.fn()
    renderHeaderBar({ onPersonaChange })
    const toggle = screen.getByRole('button', { name: /change/i })
    fireEvent.click(toggle)
    expect(onPersonaChange).not.toHaveBeenCalled()
  })

  it('shows header menu actions', () => {
    const onSelect = vi.fn()
    renderHeaderBar({
      menuActions: [
        {
          id: 'export',
          label: 'Download session JSON',
          onSelect,
        },
      ],
    })
    fireEvent.click(screen.getByRole('button', { name: /open more actions/i }))
    fireEvent.click(screen.getByText(/download session json/i))
    expect(onSelect).toHaveBeenCalled()
  })
})
