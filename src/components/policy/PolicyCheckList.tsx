import React from 'react'
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Shield, Loader2 } from 'lucide-react'
import type { PolicyCheck, PolicyCheckStatus, PolicyEvaluationResult } from '../../types/policy'

interface PolicyCheckListProps {
  result: PolicyEvaluationResult
  compact?: boolean
  isLoading?: boolean
}

const statusConfig: Record<
  PolicyCheckStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  pass: {
    icon: CheckCircle,
    color: 'var(--success)',
    bgColor: 'var(--success)/10',
  },
  warn: {
    icon: AlertTriangle,
    color: 'var(--warning)',
    bgColor: 'var(--warning)/10',
  },
  fail: {
    icon: XCircle,
    color: 'var(--error)',
    bgColor: 'var(--error)/10',
  },
}

function CheckItem({ check, compact }: { check: PolicyCheck; compact?: boolean }) {
  const [expanded, setExpanded] = React.useState(false)
  const config = statusConfig[check.status]
  const Icon = config.icon
  const hasDetails = check.details && (check.details.current || check.details.limit)

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1"
        style={{ background: config.bgColor }}
      >
        <Icon className="h-3 w-3 flex-shrink-0" style={{ color: config.color }} />
        <span className="text-xs truncate" style={{ color: config.color }}>
          {check.label}
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border transition-colors"
      style={{
        borderColor: check.status === 'pass' ? 'var(--line)' : config.color,
        background: check.status === 'pass' ? 'transparent' : config.bgColor,
      }}
    >
      <button
        type="button"
        onClick={() => hasDetails && setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        disabled={!hasDetails}
      >
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: config.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
              {check.label}
            </span>
            {hasDetails && (
              <span style={{ color: 'var(--text-muted)' }}>
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
            {check.message}
          </p>
        </div>
      </button>

      {expanded && hasDetails && (
        <div
          className="border-t px-3 py-2"
          style={{ borderColor: 'var(--line)' }}
        >
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {check.details?.current && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current: </span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {check.details.current}
                </span>
              </div>
            )}
            {check.details?.limit && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Limit: </span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {check.details.limit}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBadge({ result }: { result: PolicyEvaluationResult }) {
  const { canProceed, blockingCount, warningCount, checks } = result
  const passCount = checks.filter((c) => c.status === 'pass').length

  if (blockingCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: 'var(--error)/10' }}
      >
        <XCircle className="h-3.5 w-3.5" style={{ color: 'var(--error)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--error)' }}>
          {blockingCount} blocking
        </span>
      </div>
    )
  }

  if (warningCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: 'var(--warning)/10' }}
      >
        <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--warning)' }}>
          {warningCount} warning{warningCount > 1 ? 's' : ''}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: 'var(--success)/10' }}
    >
      <CheckCircle className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
      <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
        {passCount} passed
      </span>
    </div>
  )
}

export function PolicyCheckList({ result, compact = false, isLoading = false }: PolicyCheckListProps) {
  const { checks, canProceed, blockingCount, warningCount } = result

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-xl border px-3 py-4"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Checking policies...
        </span>
      </div>
    )
  }

  // No checks to show
  if (checks.length === 0) {
    return null
  }

  // Compact mode - only show issues as badges
  if (compact) {
    const issues = checks.filter((c) => c.status !== 'pass')
    if (issues.length === 0) {
      return (
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
          <span className="text-xs" style={{ color: 'var(--success)' }}>
            All checks pass
          </span>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {issues.map((check) => (
          <CheckItem key={check.id} check={check} compact />
        ))}
      </div>
    )
  }

  // Group checks by status for better organization
  const failingChecks = checks.filter((c) => c.status === 'fail')
  const warningChecks = checks.filter((c) => c.status === 'warn')
  const passingChecks = checks.filter((c) => c.status === 'pass')

  // Sort: failing first, then warnings, then passing
  const sortedChecks = [...failingChecks, ...warningChecks, ...passingChecks]

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2.5"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
            Policy Check
          </span>
        </div>
        <SummaryBadge result={result} />
      </div>

      {/* Checks List */}
      <div className="p-2 space-y-1.5">
        {sortedChecks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>

      {/* Footer message */}
      {!canProceed && (
        <div
          className="border-t px-3 py-2"
          style={{ borderColor: 'var(--line)' }}
        >
          <p className="text-[10px]" style={{ color: 'var(--error)' }}>
            Resolve blocking issues before proceeding
          </p>
        </div>
      )}
    </div>
  )
}
