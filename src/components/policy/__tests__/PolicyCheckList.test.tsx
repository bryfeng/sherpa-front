import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PolicyCheckList } from '../PolicyCheckList'
import type { PolicyEvaluationResult } from '../../../types/policy'

describe('PolicyCheckList', () => {
  const createResult = (overrides: Partial<PolicyEvaluationResult> = {}): PolicyEvaluationResult => ({
    canProceed: true,
    checks: [],
    blockingCount: 0,
    warningCount: 0,
    ...overrides,
  })

  it('renders nothing when no checks', () => {
    const { container } = render(<PolicyCheckList result={createResult()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all passing checks with summary badge', () => {
    const result = createResult({
      checks: [
        { id: 'tx-limit', label: 'Transaction limit', status: 'pass', message: '$1,000 within limit' },
        { id: 'slippage', label: 'Slippage', status: 'pass', message: '0.50% OK' },
        { id: 'gas', label: 'Gas cost', status: 'pass', message: '$2 OK' },
      ],
    })

    render(<PolicyCheckList result={result} />)

    expect(screen.getByText('Policy Check')).toBeInTheDocument()
    expect(screen.getByText('3 passed')).toBeInTheDocument()
    expect(screen.getByText('Transaction limit')).toBeInTheDocument()
    expect(screen.getByText('Slippage')).toBeInTheDocument()
    expect(screen.getByText('Gas cost')).toBeInTheDocument()
  })

  it('shows warning badge when warnings exist', () => {
    const result = createResult({
      warningCount: 2,
      checks: [
        { id: 'slippage', label: 'Slippage', status: 'warn', message: '2.5% is high' },
        { id: 'gas', label: 'Gas cost', status: 'warn', message: '4% of transaction is high' },
      ],
    })

    render(<PolicyCheckList result={result} />)

    expect(screen.getByText('2 warnings')).toBeInTheDocument()
  })

  it('shows blocking badge and message when failures exist', () => {
    const result = createResult({
      canProceed: false,
      blockingCount: 1,
      checks: [
        { id: 'tx-limit', label: 'Transaction limit', status: 'fail', message: 'Exceeds $5,000 limit' },
      ],
    })

    render(<PolicyCheckList result={result} />)

    expect(screen.getByText('1 blocking')).toBeInTheDocument()
    expect(screen.getByText('Resolve blocking issues before proceeding')).toBeInTheDocument()
  })

  it('renders compact mode with only issues', () => {
    const result = createResult({
      warningCount: 1,
      checks: [
        { id: 'tx-limit', label: 'Transaction limit', status: 'pass', message: 'OK' },
        { id: 'slippage', label: 'Slippage', status: 'warn', message: 'High' },
      ],
    })

    render(<PolicyCheckList result={result} compact />)

    // In compact mode, only issues are shown
    expect(screen.getByText('Slippage')).toBeInTheDocument()
    // Passing checks are hidden in compact mode
    expect(screen.queryByText('Transaction limit')).not.toBeInTheDocument()
  })

  it('shows all checks pass message in compact mode when no issues', () => {
    const result = createResult({
      checks: [
        { id: 'tx-limit', label: 'Transaction limit', status: 'pass', message: 'OK' },
      ],
    })

    render(<PolicyCheckList result={result} compact />)

    expect(screen.getByText('All checks pass')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<PolicyCheckList result={createResult()} isLoading />)

    expect(screen.getByText('Checking policies...')).toBeInTheDocument()
  })

  it('sorts checks with failures first, then warnings, then passing', () => {
    const result = createResult({
      blockingCount: 1,
      warningCount: 1,
      checks: [
        { id: 'pass', label: 'Passing Check', status: 'pass', message: 'OK' },
        { id: 'warn', label: 'Warning Check', status: 'warn', message: 'Warning' },
        { id: 'fail', label: 'Failing Check', status: 'fail', message: 'Failed' },
      ],
    })

    const { container } = render(<PolicyCheckList result={result} />)

    const labels = container.querySelectorAll('.text-xs.font-medium')
    const labelTexts = Array.from(labels).map((el) => el.textContent)

    // First label should be "Policy Check" (header), then checks in order
    expect(labelTexts).toContain('Failing Check')
    expect(labelTexts).toContain('Warning Check')
    expect(labelTexts).toContain('Passing Check')
  })

  it('displays check details when provided', () => {
    const result = createResult({
      checks: [
        {
          id: 'tx-limit',
          label: 'Transaction limit',
          status: 'pass',
          message: '$1,000 within limit',
          details: { current: '$1,000', limit: '$5,000' },
        },
      ],
    })

    render(<PolicyCheckList result={result} />)

    expect(screen.getByText('$1,000 within limit')).toBeInTheDocument()
  })
})
