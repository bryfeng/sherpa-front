import { render, screen } from '@testing-library/react'
import { StrategyForm } from '../StrategyForm'

describe('StrategyForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    mode: 'create' as const,
  }

  it('renders form sections', () => {
    render(<StrategyForm {...defaultProps} />)
    expect(screen.getByText('Strategy Name')).toBeInTheDocument()
    expect(screen.getByText(/Amount/i)).toBeInTheDocument()
    expect(screen.getByText('Frequency')).toBeInTheDocument()
  })

  it('renders token selection buttons', () => {
    render(<StrategyForm {...defaultProps} />)
    // There are two token selectors (from and to)
    const tokenButtons = screen.getAllByText('Select token')
    expect(tokenButtons).toHaveLength(2)
  })

  it('renders submit button with correct text for create mode', () => {
    render(<StrategyForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Create Strategy' })).toBeInTheDocument()
  })

  it('renders submit button with correct text for edit mode', () => {
    render(<StrategyForm {...defaultProps} mode="edit" />)
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('disables submit button when submitting', () => {
    render(<StrategyForm {...defaultProps} isSubmitting={true} />)
    const submitButton = screen.getByRole('button', { name: /Creating|Saving/i })
    expect(submitButton).toBeDisabled()
  })

  it('renders cancel button', () => {
    render(<StrategyForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders advanced settings section', () => {
    render(<StrategyForm {...defaultProps} />)
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
  })
})
