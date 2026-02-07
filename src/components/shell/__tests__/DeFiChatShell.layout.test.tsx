/**
 * DeFiChatShell Layout Guardrail Tests
 *
 * GUARDRAIL: These tests prevent a regression where the widget panel slot
 * takes layout space even when the panel is closed, causing the chat to
 * render at 50% width instead of full width.
 *
 * Root cause (fixed): framer-motion's AnimatePresence kept the exit-animated
 * motion.div in the DOM with flex-1, consuming 50% of the flex container.
 *
 * Fix: The parent wrapper div in DeFiChatShell controls layout via className
 * toggling (flex-1 when visible, hidden when not). The WidgetPanel's motion.div
 * only handles animation, not layout sizing.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock heavy children that require providers (wagmi, convex, etc.)
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: null })),
}))

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}))

vi.mock('../../header/HeaderBar', () => ({
  HeaderBar: () => <div data-testid="mock-header">Header</div>,
}))

vi.mock('../../surfaces/ChatSurface', () => ({
  ChatSurface: () => <div data-testid="mock-chat">Chat</div>,
}))

vi.mock('../../surfaces/WidgetPanel', () => ({
  WidgetPanel: ({ isVisible }: { isVisible: boolean }) => (
    <div data-testid="mock-widget-panel" data-visible={isVisible}>
      Widget Panel
    </div>
  ),
}))

vi.mock('../../sidebar/ConversationSidebar', () => ({
  ConversationSidebar: () => null,
}))

import { DeFiChatShell, type DeFiChatShellProps } from '../DeFiChatShell'

// Minimal mock props for rendering the shell
function createShellProps(overrides: Partial<DeFiChatShellProps> = {}): DeFiChatShellProps {
  return {
    header: {
      persona: 'friendly',
      onPersonaChange: () => {},
      onModelChange: () => {},
      walletButton: null,
    },
    sidebarVisible: false,
    onToggleSidebar: () => {},
    walletAddress: '0xtest',
    onNewChat: () => {},
    widgetPanelVisible: false,
    onToggleWidgetPanel: () => {},
    widgetButtonLabel: 'Widgets',
    widgetCount: 0,
    chat: {
      messages: [],
      isTyping: false,
      inputValue: '',
      onInputChange: () => {},
      onSend: () => {},
      onQuickPrompt: () => {},
    },
    widgetPanel: {
      panelWidgets: [],
      activeWidgetId: null,
      panelWidth: 500,
      walletAddress: '0xtest',
      walletReady: true,
      onTabClick: () => {},
      onTabClose: () => {},
      onPanelResize: () => {},
    },
    ...overrides,
  }
}

describe('DeFiChatShell Layout', () => {
  it('widget panel slot should be hidden when widgetPanelVisible=false', () => {
    render(<DeFiChatShell {...createShellProps({ widgetPanelVisible: false })} />)

    const slot = screen.getByTestId('widget-panel-slot')
    expect(slot.className).toContain('hidden')
    expect(slot.className).not.toContain('flex-1')
  })

  it('widget panel slot should be flex-1 when widgetPanelVisible=true', () => {
    render(<DeFiChatShell {...createShellProps({ widgetPanelVisible: true })} />)

    const slot = screen.getByTestId('widget-panel-slot')
    expect(slot.className).toContain('flex-1')
    expect(slot.className).toContain('lg:flex')
  })

  it('widget panel slot should not have display:flex when panel is closed', () => {
    render(<DeFiChatShell {...createShellProps({ widgetPanelVisible: false })} />)

    const slot = screen.getByTestId('widget-panel-slot')
    // The slot should only have 'hidden' class (display:none)
    // It must NOT have lg:flex or flex-1 that would cause it to take space
    const classes = slot.className.split(/\s+/)
    expect(classes).toContain('hidden')
    expect(classes).not.toContain('lg:flex')
    expect(classes).not.toContain('flex-1')
  })

  it('widget panel slot classes toggle correctly between open and closed', () => {
    const { rerender } = render(
      <DeFiChatShell {...createShellProps({ widgetPanelVisible: false })} />
    )
    const slot = screen.getByTestId('widget-panel-slot')

    // Closed state
    expect(slot.className).toBe('hidden')

    // Open state
    rerender(<DeFiChatShell {...createShellProps({ widgetPanelVisible: true })} />)
    expect(slot.className).toContain('flex-1')
    expect(slot.className).toContain('lg:flex')

    // Close again — must revert to hidden, no leftover flex classes
    rerender(<DeFiChatShell {...createShellProps({ widgetPanelVisible: false })} />)
    expect(slot.className).toBe('hidden')
  })
})
