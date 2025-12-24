import React from 'react'
import { PanelRight, PanelRightClose } from 'lucide-react'

import { HeaderBar, type HeaderBarProps } from '../header/HeaderBar'
import { ChatSurface, type ChatSurfaceProps } from '../surfaces/ChatSurface'
import { WorkspaceSurface, type WorkspaceSurfaceProps } from '../surfaces/WorkspaceSurface'
import { Button, Card } from '../ui/primitives'
import { ResizablePanel } from '../ui/ResizablePanel'

export interface DeFiChatShellProps {
  header: HeaderBarProps
  workspaceVisible: boolean
  onToggleWorkspace: () => void
  workspaceButtonLabel: string
  conversationDisplay: string
  railChip?: React.ReactNode
  chat: ChatSurfaceProps
  workspace: WorkspaceSurfaceProps
}

export function DeFiChatShell({
  header,
  workspaceVisible,
  onToggleWorkspace,
  workspaceButtonLabel,
  conversationDisplay,
  railChip,
  chat,
  workspace,
}: DeFiChatShellProps) {
  return (
    <div className="app-chrome min-h-[calc(100vh-64px)] w-full py-10">
      <div className="flex w-full flex-col gap-8">
        <HeaderBar {...header} />

        <Card className="overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-4 border-b px-[var(--s4)] py-[var(--s3)]"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={workspaceVisible ? 'secondary' : 'outline'}
                onClick={onToggleWorkspace}
                aria-pressed={workspaceVisible}
                className="rounded-md"
              >
                {workspaceVisible ? (
                  <PanelRightClose className="mr-1.5 h-4 w-4" />
                ) : (
                  <PanelRight className="mr-1.5 h-4 w-4" />
                )}
                {workspaceButtonLabel}
              </Button>
              {!workspaceVisible && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Click to show workspace
                </span>
              )}
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

          {workspaceVisible ? (
            <div className="flex flex-col lg:flex-row">
              <ResizablePanel
                defaultWidth={380}
                minWidth={280}
                maxWidth={600}
                side="left"
                className="hidden lg:block border-r"
              >
                <section
                  className="h-full bg-[var(--surface-2)]/30"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div className="flex h-full min-h-[420px] flex-col lg:max-h-[calc(100vh-260px)]">
                    <div
                      className="flex items-center justify-between gap-2 border-b px-4 py-3 text-xs tracking-wide uppercase"
                      style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                    >
                      <span>Chat</span>
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
                    <span>Chat</span>
                    <span className="badge badge--secondary">Active</span>
                  </div>
                  <ChatSurface {...chat} />
                </div>
              </section>

              <section
                className="flex-1 flex h-full min-h-[520px] flex-col lg:max-h-[calc(100vh-260px)]"
              >
                <WorkspaceSurface {...workspace} />
              </section>
            </div>
          ) : (
            <section role="region">
              <ChatSurface {...chat} />
            </section>
          )}
        </Card>
      </div>
    </div>
  )
}
