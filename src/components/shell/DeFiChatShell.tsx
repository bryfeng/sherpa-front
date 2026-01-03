import React from 'react'
import { PanelRight, PanelRightClose } from 'lucide-react'

import { HeaderBar, type HeaderBarProps } from '../header/HeaderBar'
import { ChatSurface, type ChatSurfaceProps } from '../surfaces/ChatSurface'
import { ArtifactPanel, type ArtifactPanelProps } from '../surfaces/ArtifactPanel'
import { Button, Card } from '../ui/primitives'
import { ResizablePanel } from '../ui/ResizablePanel'

export interface DeFiChatShellProps {
  header: HeaderBarProps
  /** Whether the artifact panel is visible */
  artifactPanelVisible: boolean
  /** Toggle artifact panel visibility */
  onToggleArtifactPanel: () => void
  /** Label for the artifact panel button */
  artifactButtonLabel: string
  /** Number of open artifact tabs */
  artifactCount: number
  conversationDisplay: string
  railChip?: React.ReactNode
  chat: ChatSurfaceProps
  /** Artifact panel props */
  artifacts: Omit<ArtifactPanelProps, 'isVisible' | 'onCollapse'>
}

export function DeFiChatShell({
  header,
  artifactPanelVisible,
  onToggleArtifactPanel,
  artifactButtonLabel,
  artifactCount,
  conversationDisplay,
  railChip,
  chat,
  artifacts,
}: DeFiChatShellProps) {
  return (
    <div className="flex h-screen w-full flex-col px-4 py-4 lg:px-6 overflow-hidden">
      <div className="shrink-0">
        <HeaderBar {...header} />
      </div>

      <Card className="mt-4 flex-1 flex flex-col overflow-hidden min-h-0">
          <div
            className="flex flex-wrap items-center justify-between gap-4 border-b px-[var(--s4)] py-[var(--s3)] shrink-0"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={artifactPanelVisible ? 'secondary' : 'outline'}
                onClick={onToggleArtifactPanel}
                aria-pressed={artifactPanelVisible}
                className="rounded-md"
              >
                {artifactPanelVisible ? (
                  <PanelRightClose className="mr-1.5 h-4 w-4" />
                ) : (
                  <PanelRight className="mr-1.5 h-4 w-4" />
                )}
                {artifactButtonLabel}
                {artifactCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {artifactCount}
                  </span>
                )}
              </Button>
              {!artifactPanelVisible && artifactCount > 0 && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {artifactCount} artifact{artifactCount !== 1 ? 's' : ''} available
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

          <div className="flex flex-1 flex-col lg:flex-row min-h-0">
            {/* Chat Panel - Desktop */}
            {/* Chat expands when artifact panel is closed OR when no artifacts exist */}
            {artifactPanelVisible && artifactCount > 0 ? (
              // Resizable chat when artifact panel is open
              <ResizablePanel
                defaultWidth={450}
                minWidth={350}
                maxWidth={600}
                side="left"
                className="hidden lg:flex lg:flex-col border-r"
              >
                <section
                  className="flex flex-1 flex-col min-h-0 bg-[var(--surface-2)]/30"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div
                    className="flex items-center justify-between gap-2 border-b px-4 py-3 text-xs tracking-wide uppercase shrink-0"
                    style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                  >
                    <span>Chat</span>
                    <span className="badge badge--secondary">Active</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatSurface {...chat} />
                  </div>
                </section>
              </ResizablePanel>
            ) : (
              // Full-width chat when artifact panel is closed
              <section
                className="hidden lg:flex flex-1 flex-col min-h-0 bg-[var(--surface-2)]/30"
                style={{ borderColor: 'var(--line)' }}
              >
                <div
                  className="flex items-center justify-between gap-2 border-b px-4 py-3 text-xs tracking-wide uppercase shrink-0"
                  style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                >
                  <span>Chat</span>
                  <span className="badge badge--secondary">Active</span>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatSurface {...chat} />
                </div>
              </section>
            )}

            {/* Chat Panel - Mobile (full width) */}
            <section
              className="lg:hidden flex-1 flex flex-col min-h-0 border-b bg-[var(--surface-2)]/40"
              style={{ borderColor: 'var(--line)' }}
            >
              <div
                className="flex items-center justify-between gap-2 border-b px-4 py-3 text-xs tracking-wide uppercase shrink-0"
                style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
              >
                <span>Chat</span>
                <span className="badge badge--secondary">Active</span>
              </div>
              <div className="flex-1 min-h-0">
                <ChatSurface {...chat} />
              </div>
            </section>

            {/* Artifact Panel */}
            <ArtifactPanel
              {...artifacts}
              isVisible={artifactPanelVisible}
              onCollapse={onToggleArtifactPanel}
            />
          </div>
        </Card>
    </div>
  )
}
