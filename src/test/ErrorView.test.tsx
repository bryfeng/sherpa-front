import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { ErrorView } from '../components/ErrorView'

describe('ErrorView', () => {
  it('renders title and message', () => {
    render(<ErrorView title="Test" message="Something failed" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Something failed')).toBeInTheDocument()
  })

  it('calls onRetry handler', () => {
    const onRetry = vi.fn()
    render(<ErrorView onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
