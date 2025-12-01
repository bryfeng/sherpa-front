import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HistoryTrendCard } from '../HistoryTrendCard'

const event = {
  type: 'large_outflow',
  severity: 'warning' as const,
  summary: 'Large outflow detected',
}

describe('HistoryTrendCard', () => {
  it('renders summary text', () => {
    render(<HistoryTrendCard event={event} />)
    expect(screen.getByText(/Large outflow detected/)).toBeInTheDocument()
  })
})
