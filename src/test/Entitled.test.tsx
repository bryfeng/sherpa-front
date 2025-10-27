import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { Entitled } from '../components/Entitled'
import { EntitlementsProvider } from '../hooks/useEntitlements'

describe('Entitled', () => {
  it('renders children when isPro is true', () => {
    render(
      <EntitlementsProvider value={{ isPro: true }}>
        <Entitled>
          <span>premium</span>
        </Entitled>
      </EntitlementsProvider>,
    )

    expect(screen.getByText('premium')).toBeInTheDocument()
  })

  it('renders fallback and triggers upgrade handler when not entitled', () => {
    const requestUpgrade = vi.fn()
    render(
      <EntitlementsProvider value={{ isPro: false, requestProUpgrade: requestUpgrade }}>
        <Entitled fallback={({ requestProUpgrade }) => (
          <button type="button" onClick={() => requestProUpgrade?.('action')}>
            Request upgrade
          </button>
        )}>
          <span>premium</span>
        </Entitled>
      </EntitlementsProvider>,
    )

    const fallbackButton = screen.getByRole('button', { name: /request upgrade/i })
    fireEvent.click(fallbackButton)
    expect(requestUpgrade).toHaveBeenCalledWith('action')
    expect(screen.queryByText('premium')).not.toBeInTheDocument()
  })

  it('falls back to default button when no fallback provided', () => {
    render(
      <Entitled>
        <span>premium</span>
      </Entitled>,
    )

    expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument()
  })
})
