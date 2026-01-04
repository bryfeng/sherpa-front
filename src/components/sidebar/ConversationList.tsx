import React from 'react'
import { ConversationItem } from './ConversationItem'
import type { ConversationGroup } from '../../utils/dateGroups'

interface ConversationListProps {
  groups: ConversationGroup[]
  currentConversationId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function ConversationList({
  groups,
  currentConversationId,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}: ConversationListProps) {
  if (groups.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 px-4 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        <p className="text-sm">No conversations found</p>
        <p className="text-xs mt-1">Start a new chat to begin</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Date header */}
          <div className="px-3 mb-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {group.label}
            </span>
          </div>

          {/* Conversations in this group */}
          <div className="space-y-0.5">
            {group.conversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                id={conv._id}
                title={conv.title}
                updatedAt={conv.updatedAt}
                isActive={currentConversationId === conv._id}
                onClick={() => onSelect(conv._id)}
                onRename={(title) => onRename(conv._id, title)}
                onArchive={() => onArchive(conv._id)}
                onDelete={() => onDelete(conv._id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
