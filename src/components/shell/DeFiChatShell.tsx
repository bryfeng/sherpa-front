import React from 'react'

import type { SurfaceId } from '../../hooks/useShellUIReducer'
import { HeaderBar, type HeaderBarProps } from '../header/HeaderBar'
import { ChatSurface, type ChatSurfaceProps } from '../surfaces/ChatSurface'
import { WorkspaceSurface, type WorkspaceSurfaceProps } from '../surfaces/WorkspaceSurface'
import { Card } from '../ui/primitives'
import { ResizablePanel } from '../ui/ResizablePanel'

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
  const isWorkspaceView = activeSurface === 'workspace'

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
    <div className="app-chrome min-h-[calc(100vh-64px)] w-full py-10">
      <div className="flex w-full flex-col gap-8">
        <HeaderBar {...header} />

        <Card className="overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-4 border-b px-[var(--s4)] py-[var(--s3)]"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <div
              className="tabs"
              role="group"
              aria-label="Surface selection"
              onKeyDown={handleTabKeyDown}
            >
              <button
                type="button"
                id="surface-tab-conversation"
                ref={(el) => {
                  surfaceRefs.current.conversation = el
                }}
                aria-pressed={activeSurface === 'conversation'}
                className="tab"
                onClick={() => onSelectSurface('conversation')}
              >
                Conversation view
              </button>
              <button
                type="button"
                id="surface-tab-workspace"
                ref={(el) => {
                  surfaceRefs.current.workspace = el
                }}
                aria-pressed={activeSurface === 'workspace'}
                className="tab"
                onClick={() => onSelectSurface('workspace')}
              >
                <span className="flex items-center gap-1">
                  <span>{workspaceButtonLabel}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">(docked)</span>
                </span>
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
          {isWorkspaceView ? (
            <div className="flex flex-col lg:flex-row">
              <ResizablePanel
                defaultWidth={380}
                minWidth={280}
                maxWidth={600}
                side="left"
                className="hidden lg:block border-r"
              >
                <section
                  id="surface-panel-conversation"
                  aria-labelledby="surface-tab-conversation"
                  className="h-full bg-[var(--surface-2)]/30"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div className="flex h-full min-h-[420px] flex-col lg:max-h-[calc(100vh-260px)]">
                    <div
                      className="flex items-center justify-between gap-2 border-b px-4 py-3 text-xs tracking-wide uppercase"
                      style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                    >
                      <span>Chat docked</span>
                      <span className="badge badge--secondary">Active</span>
                    </div>
                    <ChatSurface {...chat} />
                  </div>
                </section>
              </ResizablePanel>
              <section
                className="lg:hidden border-b bg-[var(--surface-2)]/40"
                style={{ borderColor: 'var(--line)' }}
              >
                <div className="flex min-h-[420px] flex-col">
                  <div
                    className="flex items-center justify-between gap-2 border-b px-4 py-3 text-xs tracking-wide uppercase"
                    style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                  >
                    <span>Chat docked</span>
                    <span className="badge badge--secondary">Active</span>
                  </div>
                  <ChatSurface {...chat} />
                </div>
              </section>
              <section
                id="surface-panel-workspace"
                aria-labelledby="surface-tab-workspace"
                className="flex-1 flex h-full min-h-[520px] flex-col lg:max-h-[calc(100vh-260px)]"
              >
                <WorkspaceSurface {...workspace} />
              </section>
            </div>
          ) : (
            <>
              <section
                id="surface-panel-conversation"
                aria-labelledby="surface-tab-conversation"
                role="region"
              >
                <ChatSurface {...chat} />
              </section>
              <section
                id="surface-panel-workspace"
                aria-labelledby="surface-tab-workspace"
                role="region"
                hidden
                aria-hidden="true"
              />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
