import React, { useState } from 'react'
import {
  Users,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  BarChart3,
  Settings,
} from 'lucide-react'
import { LeaderCard } from './LeaderCard'
import { RelationshipCard } from './RelationshipCard'
import { PendingApprovalCard } from './PendingApprovalCard'
import {
  useCopyRelationships,
  usePendingCopyApprovals,
  useLeaderboard,
  useCopyStats,
  useCopyRelationshipMutations,
  useCopyExecutionMutations,
  formatUsdValue,
  formatPercentage,
} from '../../hooks/useCopyTrading'
import type { LeaderProfile } from '../../types/copy-trading'

type Tab = 'my-copies' | 'discover' | 'analytics'
type View = 'list' | 'leader-profile' | 'relationship-details' | 'new-copy'

interface CopyTradingWidgetProps {
  userId: string | null
  walletAddress: string | null
  onStartCopy?: (leader: LeaderProfile) => void
}

export function CopyTradingWidget({
  userId,
  walletAddress,
  onStartCopy,
}: CopyTradingWidgetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('my-copies')
  const [view, setView] = useState<View>('list')
  const [selectedLeader, setSelectedLeader] = useState<LeaderProfile | null>(null)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Data hooks
  const { relationships, isLoading: relationshipsLoading, activeCount, pausedCount } = useCopyRelationships(userId)
  const { approvals, count: pendingCount, isLoading: approvalsLoading } = usePendingCopyApprovals(userId)
  const { leaders, isLoading: leadersLoading } = useLeaderboard({ limit: 20, minTrades: 10 })
  const { stats, isLoading: statsLoading } = useCopyStats(userId)

  // Mutations
  const relationshipMutations = useCopyRelationshipMutations()
  const executionMutations = useCopyExecutionMutations()

  // Check if already copying a leader
  const getCopiedLeaderIds = () => {
    return new Set(relationships.map(r => `${r.config.leaderAddress.toLowerCase()}-${r.config.leaderChain}`))
  }

  const handleCopyLeader = (leader: LeaderProfile) => {
    if (onStartCopy) {
      onStartCopy(leader)
    } else {
      setSelectedLeader(leader)
      setView('new-copy')
    }
  }

  const handleViewLeaderProfile = (leader: LeaderProfile) => {
    setSelectedLeader(leader)
    setView('leader-profile')
  }

  const handleBack = () => {
    setView('list')
    setSelectedLeader(null)
    setSelectedRelationshipId(null)
  }

  // Filter relationships by search
  const filteredRelationships = relationships.filter(r => {
    if (!searchQuery) return true
    const label = r.config.leaderLabel?.toLowerCase() || ''
    const address = r.config.leaderAddress.toLowerCase()
    const query = searchQuery.toLowerCase()
    return label.includes(query) || address.includes(query)
  })

  const copiedLeaderIds = getCopiedLeaderIds()

  return (
    <div className="h-full flex flex-col">
      {/* Header with back button when in detail view */}
      {view !== 'list' && (
        <div
          className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <button
            className="p-1 rounded hover:bg-opacity-80"
            style={{ color: 'var(--text-muted)' }}
            onClick={handleBack}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {view === 'leader-profile' && 'Leader Profile'}
            {view === 'relationship-details' && 'Copy Details'}
            {view === 'new-copy' && 'Start Copying'}
          </span>
        </div>
      )}

      {/* Tabs - only show in list view */}
      {view === 'list' && (
        <div
          className="flex items-center gap-1 px-4 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <TabButton
            active={activeTab === 'my-copies'}
            onClick={() => setActiveTab('my-copies')}
            badge={activeCount > 0 ? activeCount : undefined}
          >
            <Users size={14} />
            My Copies
          </TabButton>
          <TabButton
            active={activeTab === 'discover'}
            onClick={() => setActiveTab('discover')}
          >
            <TrendingUp size={14} />
            Discover
          </TabButton>
          <TabButton
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={14} />
            Analytics
          </TabButton>

          {/* Pending approvals badge */}
          {pendingCount > 0 && (
            <div
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                background: 'var(--warning-bg)',
                color: 'var(--warning)',
              }}
            >
              <Clock size={12} />
              {pendingCount} pending
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'list' && activeTab === 'my-copies' && (
          <MyCopiesTab
            relationships={filteredRelationships}
            approvals={approvals}
            isLoading={relationshipsLoading || approvalsLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onPause={relationshipMutations.pause}
            onResume={relationshipMutations.resume}
            onDelete={relationshipMutations.remove}
            onEdit={(id) => {
              setSelectedRelationshipId(id)
              setView('relationship-details')
            }}
            onViewHistory={(id) => {
              setSelectedRelationshipId(id)
              setView('relationship-details')
            }}
            onApprove={executionMutations.approve}
            onReject={executionMutations.reject}
          />
        )}

        {view === 'list' && activeTab === 'discover' && (
          <DiscoverTab
            leaders={leaders}
            isLoading={leadersLoading}
            copiedLeaderIds={copiedLeaderIds}
            onCopy={handleCopyLeader}
            onViewProfile={handleViewLeaderProfile}
          />
        )}

        {view === 'list' && activeTab === 'analytics' && (
          <AnalyticsTab stats={stats} isLoading={statsLoading} />
        )}

        {view === 'leader-profile' && selectedLeader && (
          <LeaderProfileView
            leader={selectedLeader}
            isAlreadyCopying={copiedLeaderIds.has(`${selectedLeader.address.toLowerCase()}-${selectedLeader.chain}`)}
            onCopy={handleCopyLeader}
          />
        )}
      </div>
    </div>
  )
}

// Tab button component
function TabButton({
  children,
  active,
  onClick,
  badge,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative"
      style={{
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--surface)' : 'var(--text-muted)',
      }}
      onClick={onClick}
    >
      {children}
      {badge !== undefined && (
        <span
          className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
          style={{
            background: active ? 'var(--surface)' : 'var(--accent)',
            color: active ? 'var(--accent)' : 'var(--surface)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// My Copies Tab
function MyCopiesTab({
  relationships,
  approvals,
  isLoading,
  searchQuery,
  onSearchChange,
  onPause,
  onResume,
  onDelete,
  onEdit,
  onViewHistory,
  onApprove,
  onReject,
}: {
  relationships: ReturnType<typeof useCopyRelationships>['relationships']
  approvals: ReturnType<typeof usePendingCopyApprovals>['approvals']
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onPause: (id: string, reason?: string) => Promise<unknown>
  onResume: (id: string) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  onEdit: (id: string) => void
  onViewHistory: (id: string) => void
  onApprove: (id: string) => Promise<{ success: boolean }>
  onReject: (id: string, reason?: string) => Promise<unknown>
}) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="Search leaders..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
          }}
        />
      </div>

      {/* Pending approvals section */}
      {approvals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Clock size={14} style={{ color: 'var(--warning)' }} />
            Pending Approvals ({approvals.length})
          </h3>
          <div className="space-y-2">
            {approvals.map((execution) => (
              <PendingApprovalCard
                key={execution.id}
                execution={execution}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Relationships list */}
      {relationships.length === 0 ? (
        <EmptyState
          title="No copy relationships"
          description="Start copying a trader to see them here"
          icon={<Users size={32} />}
        />
      ) : (
        <div className="space-y-3">
          {relationships.map((rel) => (
            <RelationshipCard
              key={rel.id}
              relationship={rel}
              onPause={onPause}
              onResume={onResume}
              onDelete={onDelete}
              onEdit={onEdit}
              onViewHistory={onViewHistory}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Discover Tab
function DiscoverTab({
  leaders,
  isLoading,
  copiedLeaderIds,
  onCopy,
  onViewProfile,
}: {
  leaders: LeaderProfile[]
  isLoading: boolean
  copiedLeaderIds: Set<string>
  onCopy: (leader: LeaderProfile) => void
  onViewProfile: (leader: LeaderProfile) => void
}) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (leaders.length === 0) {
    return (
      <EmptyState
        title="No leaders found"
        description="Check back later for top performers"
        icon={<TrendingUp size={32} />}
      />
    )
  }

  return (
    <div className="p-4 space-y-3">
      {leaders.map((leader, index) => (
        <LeaderCard
          key={`${leader.address}-${leader.chain}`}
          leader={leader}
          rank={index + 1}
          onCopy={onCopy}
          onViewProfile={onViewProfile}
          isAlreadyCopying={copiedLeaderIds.has(`${leader.address.toLowerCase()}-${leader.chain}`)}
        />
      ))}
    </div>
  )
}

// Analytics Tab
function AnalyticsTab({
  stats,
  isLoading,
}: {
  stats: ReturnType<typeof useCopyStats>['stats']
  isLoading: boolean
}) {
  if (isLoading || !stats) {
    return <LoadingSkeleton />
  }

  const isProfitable = stats.totalPnlUsd >= 0

  return (
    <div className="p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Volume" value={formatUsdValue(stats.totalVolumeUsd)} />
        <StatCard
          label="Total P&L"
          value={formatUsdValue(stats.totalPnlUsd)}
          valueColor={isProfitable ? 'var(--success)' : 'var(--error)'}
        />
        <StatCard label="Success Rate" value={formatPercentage(stats.successRate)} />
        <StatCard label="Total Trades" value={stats.totalTrades.toString()} />
      </div>

      {/* Breakdown */}
      <div
        className="p-4 rounded-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Trade Breakdown
        </h3>
        <div className="space-y-2">
          <BreakdownRow label="Successful" value={stats.successfulTrades} color="var(--success)" />
          <BreakdownRow label="Failed" value={stats.failedTrades} color="var(--error)" />
          <BreakdownRow label="Skipped" value={stats.skippedTrades} color="var(--text-muted)" />
        </div>
      </div>

      {/* Relationships summary */}
      <div
        className="p-4 rounded-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Copy Relationships
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {stats.totalRelationships}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
              {stats.activeRelationships}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
              {stats.pausedRelationships}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Paused</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Leader Profile View
function LeaderProfileView({
  leader,
  isAlreadyCopying,
  onCopy,
}: {
  leader: LeaderProfile
  isAlreadyCopying: boolean
  onCopy: (leader: LeaderProfile) => void
}) {
  const isProfitable = (leader.totalPnlUsd ?? 0) >= 0

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {leader.label || leader.address.slice(0, 10) + '...'}
          </h2>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {leader.address}
          </div>
        </div>
        <button
          className="px-4 py-2 rounded-lg font-medium"
          style={{
            background: isAlreadyCopying ? 'var(--surface-alt)' : 'var(--accent)',
            color: isAlreadyCopying ? 'var(--text-muted)' : 'var(--surface)',
          }}
          onClick={() => !isAlreadyCopying && onCopy(leader)}
          disabled={isAlreadyCopying}
        >
          {isAlreadyCopying ? 'Already Copying' : 'Start Copying'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Win Rate" value={formatPercentage(leader.winRate)} />
        <StatCard
          label="Total P&L"
          value={formatUsdValue(leader.totalPnlUsd)}
          valueColor={isProfitable ? 'var(--success)' : 'var(--error)'}
        />
        <StatCard label="Sharpe Ratio" value={leader.sharpeRatio?.toFixed(2) ?? '-'} />
        <StatCard label="Max Drawdown" value={formatPercentage(leader.maxDrawdownPercent)} valueColor="var(--error)" />
        <StatCard label="Total Trades" value={leader.totalTrades.toString()} />
        <StatCard label="Avg/Day" value={leader.avgTradesPerDay?.toFixed(1) ?? '0'} />
      </div>

      {/* Top tokens */}
      {leader.mostTradedTokens.length > 0 && (
        <div
          className="p-4 rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Most Traded Tokens
          </h3>
          <div className="flex flex-wrap gap-2">
            {leader.mostTradedTokens.map((token) => (
              <span
                key={token}
                className="px-2 py-1 rounded text-sm"
                style={{ background: 'var(--surface-alt)', color: 'var(--text)' }}
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Followers info */}
      <div
        className="flex items-center justify-between p-4 rounded-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text)' }}>{leader.followerCount} copiers</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {formatUsdValue(leader.totalCopiedVolumeUsd)} copied
        </div>
      </div>
    </div>
  )
}

// Helper components
function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-lg font-bold" style={{ color: valueColor || 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="font-medium" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3" style={{ color: 'var(--text-muted)' }}>
        {icon}
      </div>
      <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {description}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 rounded-lg animate-pulse"
          style={{ background: 'var(--surface-alt)' }}
        />
      ))}
    </div>
  )
}
