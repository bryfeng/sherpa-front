import React from 'react'

import type { SurfaceId } from '../../hooks/useShellUIReducer'
import { HeaderBar, type HeaderBarProps } from '../header/HeaderBar'
import { ChatSurface, type ChatSurfaceProps } from '../surfaces/ChatSurface'
import { WorkspaceSurface, type WorkspaceSurfaceProps } from '../surfaces/WorkspaceSurface'
import { Card } from '../ui/primitives'

export interface DeFiChatShellProps {
  header: HeaderBarProps
  activeSurface: SurfaceId
  onSelectSurface: (surface: SurfaceId) => void
  workspaceButtonLabel: string
  conversationDisplay: string
  railChip?: React.ReactNode
  chat: ChatSurfaceProps
  workspace: WorkspaceSurfaceProps
}

export function DeFiChatShell({
  header,
  activeSurface,
  onSelectSurface,
  workspaceButtonLabel,
  conversationDisplay,
  railChip,
  chat,
  workspace,
}: DeFiChatShellProps) {
  const surfaceRefs = React.useRef<Record<SurfaceId, HTMLButtonElement | null>>({
    conversation: null,
    workspace: null,
  })

  const handleTabKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const order: SurfaceId[] = ['conversation', 'workspace']
      const currentIndex = order.indexOf(activeSurface)
      if (currentIndex < 0) return

      const focusSurface = (index: number) => {
        const target = surfaceRefs.current[order[index]]
        target?.focus()
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          focusSurface((currentIndex + 1) % order.length)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          focusSurface((currentIndex - 1 + order.length) % order.length)
          break
        case 'Home':
          event.preventDefault()
          focusSurface(0)
          break
        case 'End':
          event.preventDefault()
          focusSurface(order.length - 1)
          break
        default:
          break
      }
    },
    [activeSurface],
  )

  return (
    <div className="app-chrome min-h-[calc(100vh-64px)] w-full px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <HeaderBar {...header} />

        <Card className="overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-[var(--s3)] py-[var(--s2)]"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <div
              className="tabs"
              role="tablist"
              aria-label="Surface selection"
              onKeyDown={handleTabKeyDown}
            >
              <button
                type="button"
                role="tab"
                id="surface-tab-conversation"
                ref={(el) => {
                  surfaceRefs.current.conversation = el
                }}
                aria-selected={activeSurface === 'conversation'}
                aria-controls="surface-panel-conversation"
                className="tab"
                onClick={() => onSelectSurface('conversation')}
              >
                Conversation
              </button>
              <button
                type="button"
                role="tab"
                id="surface-tab-workspace"
                ref={(el) => {
                  surfaceRefs.current.workspace = el
                }}
                aria-selected={activeSurface === 'workspace'}
                aria-controls="surface-panel-workspace"
                className="tab"
                onClick={() => onSelectSurface('workspace')}
              >
                {workspaceButtonLabel}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {railChip}
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="hidden sm:inline">Session</span>
                <span className="badge badge--outline">
                  {conversationDisplay}
                </span>
              </div>
            </div>
          </div>
          <div
            role="tabpanel"
            id="surface-panel-conversation"
            aria-labelledby="surface-tab-conversation"
            hidden={activeSurface !== 'conversation'}
          >
            {activeSurface === 'conversation' && <ChatSurface {...chat} />}
          </div>
          <div
            role="tabpanel"
            id="surface-panel-workspace"
            aria-labelledby="surface-tab-workspace"
            hidden={activeSurface !== 'workspace'}
          >
            {activeSurface === 'workspace' && <WorkspaceSurface {...workspace} />}
          </div>
        </Card>
      </div>
    </div>
  )
}
