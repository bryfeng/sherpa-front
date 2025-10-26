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
  const surfaceButtonClass = React.useCallback(
    (surface: SurfaceId) =>
      `rounded-full px-3 py-1.5 text-xs font-medium transition ${
        activeSurface === surface ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`,
    [activeSurface],
  )

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-slate-50/80 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <HeaderBar {...header} />

        <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/60 px-4 py-3">
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1" role="tablist" aria-label="Surface selection">
              <button
                type="button"
                role="tab"
                aria-selected={activeSurface === 'conversation'}
                className={surfaceButtonClass('conversation')}
                onClick={() => onSelectSurface('conversation')}
              >
                Conversation
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSurface === 'workspace'}
                className={surfaceButtonClass('workspace')}
                onClick={() => onSelectSurface('workspace')}
              >
                {workspaceButtonLabel}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {railChip}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="hidden sm:inline">Session</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 shadow-sm">
                  {conversationDisplay}
                </span>
              </div>
            </div>
          </div>
          {activeSurface === 'conversation' ? <ChatSurface {...chat} /> : <WorkspaceSurface {...workspace} />}
        </Card>
      </div>
    </div>
  )
}
