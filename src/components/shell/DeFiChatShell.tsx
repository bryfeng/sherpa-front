import React from 'react'
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react'

import { HeaderBar, type HeaderBarProps } from '../header/HeaderBar'
import { ChatSurface, type ChatSurfaceProps } from '../surfaces/ChatSurface'
import { WidgetPanel, type WidgetPanelProps } from '../surfaces/WidgetPanel'
import { ConversationSidebar } from '../sidebar/ConversationSidebar'
import { Button, Card } from '../ui/primitives'
import { ResizablePanel } from '../ui/ResizablePanel'

export interface DeFiChatShellProps {
  header: HeaderBarProps
  /** Whether the conversation sidebar is visible */
  sidebarVisible: boolean
  /** Toggle sidebar visibility */
  onToggleSidebar: () => void
  /** Wallet address for conversation history */
  walletAddress: string | null
  /** Handler for new chat */
  onNewChat: () => void
  /** Whether the widget panel is visible */
  widgetPanelVisible: boolean
  /** Toggle widget panel visibility */
  onToggleWidgetPanel: () => void
  /** Label for the widget panel button */
  widgetButtonLabel: string
  /** Number of open widget tabs */
  widgetCount: number
  chat: ChatSurfaceProps
  /** Widget panel props */
  widgetPanel: Omit<WidgetPanelProps, 'isVisible' | 'onCollapse'>
}

export function DeFiChatShell({
  header,
  sidebarVisible,
  onToggleSidebar,
  walletAddress,
  onNewChat,
  widgetPanelVisible,
  onToggleWidgetPanel,
  widgetButtonLabel,
  widgetCount,
  chat,
  widgetPanel,
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
              {/* Sidebar toggle */}
              <Button
                size="sm"
                variant={sidebarVisible ? 'secondary' : 'outline'}
                onClick={onToggleSidebar}
                aria-pressed={sidebarVisible}
                className="rounded-md hidden lg:inline-flex"
              >
                {sidebarVisible ? (
                  <PanelLeftClose className="mr-1.5 h-4 w-4" />
                ) : (
                  <PanelLeft className="mr-1.5 h-4 w-4" />
                )}
                History
              </Button>

              {/* Widget panel toggle */}
              <Button
                size="sm"
                variant={widgetPanelVisible ? 'secondary' : 'outline'}
                onClick={onToggleWidgetPanel}
                aria-pressed={widgetPanelVisible}
                className="rounded-md"
              >
                {widgetPanelVisible ? (
                  <PanelRightClose className="mr-1.5 h-4 w-4" />
                ) : (
                  <PanelRight className="mr-1.5 h-4 w-4" />
                )}
                {widgetButtonLabel}
                {widgetCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {widgetCount}
                  </span>
                )}
              </Button>
              {!widgetPanelVisible && widgetCount > 0 && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {widgetCount} widget{widgetCount !== 1 ? 's' : ''} available
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col lg:flex-row min-h-0">
            {/* Conversation Sidebar */}
            <ConversationSidebar
              isVisible={sidebarVisible}
              walletAddress={walletAddress}
              onNewChat={onNewChat}
              onCollapse={onToggleSidebar}
            />

            {/* Chat Panel - Desktop */}
            {/* Chat expands when widget panel is closed OR when no widgets exist */}
            {widgetPanelVisible && widgetCount > 0 ? (
              // Resizable chat when widget panel is open
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
              // Full-width chat when widget panel is closed
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

            {/* Widget Panel */}
            <WidgetPanel
              {...widgetPanel}
              isVisible={widgetPanelVisible}
              onCollapse={onToggleWidgetPanel}
            />
          </div>
        </Card>
    </div>
  )
}
