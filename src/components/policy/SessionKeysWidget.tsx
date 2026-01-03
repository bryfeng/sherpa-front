import React, { useState } from 'react'
import { Key, Plus, List } from 'lucide-react'
import type { Widget } from '../../types/widgets'
import { useSessionKeys } from '../../hooks/useSessionKeys'
import { SessionKeyList } from './SessionKeyList'
import { SessionKeyForm } from './SessionKeyForm'

interface SessionKeysWidgetProps {
  artifact?: Widget
  walletAddress?: string
}

type Tab = 'list' | 'create'

export function SessionKeysWidget({ artifact, walletAddress }: SessionKeysWidgetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('list')

  const {
    sessions,
    activeCount,
    isLoading,
    create,
    revoke,
    extend,
  } = useSessionKeys({
    walletAddress,
    includeExpired: true,
    includeRevoked: true,
  })

  if (!walletAddress) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <Key className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Connect Wallet
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet to manage session keys
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--surface-2)' }}
          >
            <Key className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Session Keys
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {activeCount} active session{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-lg p-1"
        style={{ background: 'var(--surface-2)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
            activeTab === 'list'
              ? 'bg-[var(--surface)] shadow-sm'
              : 'hover:text-[var(--text)]'
          }`}
          style={{
            color: activeTab === 'list' ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          <List className="h-3.5 w-3.5" />
          Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
            activeTab === 'create'
              ? 'bg-[var(--surface)] shadow-sm'
              : 'hover:text-[var(--text)]'
          }`}
          style={{
            color: activeTab === 'create' ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create New
        </button>
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <SessionKeyList
          sessions={sessions}
          isLoading={isLoading}
          onRevoke={revoke}
          onExtend={extend}
        />
      ) : (
        <SessionKeyForm
          onSubmit={async (config) => {
            await create(config)
            setActiveTab('list')
          }}
          onCancel={() => setActiveTab('list')}
        />
      )}
    </div>
  )
}
