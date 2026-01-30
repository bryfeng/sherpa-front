/**
 * Component Render Stability Tests
 *
 * These tests verify that components don't re-render unnecessarily
 * when unrelated state changes occur.
 */

import React, { useRef, useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useSherpaStore } from '../../store'
import { resetStoreForTesting, createMockWidget } from '../../test-utils/storeHelpers'

// ============================================
// Render Counter Component for Testing
// ============================================

interface RenderCounterProps {
  name: string
  children?: React.ReactNode
  onRender?: (count: number) => void
}

/**
 * A component that tracks and reports its render count.
 * Useful for detecting unnecessary re-renders.
 */
function RenderCounter({ name, children, onRender }: RenderCounterProps) {
  const renderCount = useRef(0)
  renderCount.current++

  useEffect(() => {
    onRender?.(renderCount.current)
  })

  return (
    <div data-testid={`render-counter-${name}`} data-render-count={renderCount.current}>
      {children}
    </div>
  )
}

// ============================================
// Mock Components that use store selectors
// ============================================

function WidgetPanelConsumer() {
  const isVisible = useSherpaStore((s) => s.isVisible)
  return (
    <RenderCounter name="widget-panel">
      <div data-testid="widget-visibility">{isVisible ? 'visible' : 'hidden'}</div>
    </RenderCounter>
  )
}

function SidebarConsumer() {
  const sidebarVisible = useSherpaStore((s) => s.sidebarVisible)
  return (
    <RenderCounter name="sidebar">
      <div data-testid="sidebar-visibility">{sidebarVisible ? 'open' : 'closed'}</div>
    </RenderCounter>
  )
}

function ChatConsumer() {
  const messages = useSherpaStore((s) => s.messages)
  return (
    <RenderCounter name="chat">
      <div data-testid="message-count">{messages.length}</div>
    </RenderCounter>
  )
}

function ThemeConsumer() {
  const theme = useSherpaStore((s) => s.theme)
  return (
    <RenderCounter name="theme">
      <div data-testid="theme">{theme}</div>
    </RenderCounter>
  )
}

// ============================================
// Tests
// ============================================

describe('Component Render Stability', () => {
  beforeEach(() => {
    resetStoreForTesting()
  })

  describe('Selective Re-rendering', () => {
    it('widget panel consumer should not re-render when chat state changes', () => {
      render(<WidgetPanelConsumer />)

      const element = screen.getByTestId('render-counter-widget-panel')
      const initialRenderCount = Number(element.getAttribute('data-render-count'))

      // Change chat state (should NOT cause re-render)
      act(() => {
        useSherpaStore.getState().addMessage({ id: 'm1', role: 'user', text: 'Hello' })
        useSherpaStore.getState().setIsTyping(true)
        useSherpaStore.getState().setInputValue('test')
      })

      const finalRenderCount = Number(element.getAttribute('data-render-count'))
      expect(finalRenderCount).toBe(initialRenderCount)
    })

    it('chat consumer should not re-render when widget panel state changes', () => {
      render(<ChatConsumer />)

      const element = screen.getByTestId('render-counter-chat')
      const initialRenderCount = Number(element.getAttribute('data-render-count'))

      // Change widget panel state (should NOT cause re-render)
      act(() => {
        useSherpaStore.getState().toggleVisibility()
        useSherpaStore.getState().setPanelWidth(600)
      })

      const finalRenderCount = Number(element.getAttribute('data-render-count'))
      expect(finalRenderCount).toBe(initialRenderCount)
    })

    it('sidebar consumer should not re-render when widget panel changes', () => {
      render(<SidebarConsumer />)

      const element = screen.getByTestId('render-counter-sidebar')
      const initialRenderCount = Number(element.getAttribute('data-render-count'))

      // Change widget state
      const widget = createMockWidget({ id: 'test' })
      act(() => {
        useSherpaStore.getState().addWidget(widget)
        useSherpaStore.getState().setActiveWidget('test')
      })

      const finalRenderCount = Number(element.getAttribute('data-render-count'))
      expect(finalRenderCount).toBe(initialRenderCount)
    })

    it('theme consumer should only re-render when theme changes', () => {
      render(<ThemeConsumer />)

      const element = screen.getByTestId('render-counter-theme')
      const afterInitialRender = Number(element.getAttribute('data-render-count'))

      // These should NOT cause re-render
      act(() => {
        useSherpaStore.getState().toggleVisibility()
        useSherpaStore.getState().toggleSidebar()
        useSherpaStore.getState().addMessage({ id: 'm1', role: 'user', text: 'Hi' })
      })

      const afterUnrelatedChanges = Number(element.getAttribute('data-render-count'))
      expect(afterUnrelatedChanges).toBe(afterInitialRender)

      // This SHOULD cause re-render
      act(() => {
        useSherpaStore.getState().toggleTheme()
      })

      const afterThemeChange = Number(element.getAttribute('data-render-count'))
      expect(afterThemeChange).toBe(afterInitialRender + 1)
    })
  })

  describe('Widget Panel Visibility Stability', () => {
    it('widget panel should maintain visibility state through data updates', () => {
      const widget = createMockWidget({ id: 'test-widget' })
      useSherpaStore.setState({
        isVisible: false,
        widgets: [widget],
        widgetTabs: ['test-widget'],
      })

      render(<WidgetPanelConsumer />)

      expect(screen.getByTestId('widget-visibility')).toHaveTextContent('hidden')

      // Simulate data refresh (update existing widget)
      act(() => {
        useSherpaStore.getState().addWidget({
          ...widget,
          payload: { updated: true },
        })
      })

      // Should still be hidden
      expect(screen.getByTestId('widget-visibility')).toHaveTextContent('hidden')
    })

    it('widget panel should update when explicitly toggled', () => {
      render(<WidgetPanelConsumer />)

      expect(screen.getByTestId('widget-visibility')).toHaveTextContent('hidden')

      act(() => {
        useSherpaStore.getState().toggleVisibility()
      })

      expect(screen.getByTestId('widget-visibility')).toHaveTextContent('visible')
    })

    it('widget panel should show when NEW widget added', () => {
      render(<WidgetPanelConsumer />)

      expect(screen.getByTestId('widget-visibility')).toHaveTextContent('hidden')

      // Add a truly new widget
      const newWidget = createMockWidget({ id: 'brand-new-widget' })
      act(() => {
        useSherpaStore.getState().addWidget(newWidget)
      })

      expect(screen.getByTestId('widget-visibility')).toHaveTextContent('visible')
    })
  })

  describe('Multi-component Isolation', () => {
    it('multiple consumers should render independently', () => {
      render(
        <>
          <WidgetPanelConsumer />
          <SidebarConsumer />
          <ChatConsumer />
          <ThemeConsumer />
        </>
      )

      const widgetCounter = screen.getByTestId('render-counter-widget-panel')
      const sidebarCounter = screen.getByTestId('render-counter-sidebar')
      const chatCounter = screen.getByTestId('render-counter-chat')
      const themeCounter = screen.getByTestId('render-counter-theme')

      const initialCounts = {
        widget: Number(widgetCounter.getAttribute('data-render-count')),
        sidebar: Number(sidebarCounter.getAttribute('data-render-count')),
        chat: Number(chatCounter.getAttribute('data-render-count')),
        theme: Number(themeCounter.getAttribute('data-render-count')),
      }

      // Only change widget visibility
      act(() => {
        useSherpaStore.getState().toggleVisibility()
      })

      // Only widget consumer should have re-rendered
      expect(Number(widgetCounter.getAttribute('data-render-count'))).toBe(initialCounts.widget + 1)
      expect(Number(sidebarCounter.getAttribute('data-render-count'))).toBe(initialCounts.sidebar)
      expect(Number(chatCounter.getAttribute('data-render-count'))).toBe(initialCounts.chat)
      expect(Number(themeCounter.getAttribute('data-render-count'))).toBe(initialCounts.theme)
    })
  })
})

describe('Loading State Stability', () => {
  beforeEach(() => {
    resetStoreForTesting()
  })

  it('should not flash loading state on data refresh', () => {
    const loadingStates: boolean[] = []

    function LoadingTracker() {
      const isTyping = useSherpaStore((s) => s.isTyping)
      loadingStates.push(isTyping)
      return <div data-testid="loading">{isTyping ? 'loading' : 'idle'}</div>
    }

    render(<LoadingTracker />)

    // Simulate multiple state changes that shouldn't trigger loading
    act(() => {
      const widget = createMockWidget({ id: 'test' })
      useSherpaStore.getState().addWidget(widget)
      useSherpaStore.getState().toggleVisibility()
      useSherpaStore.getState().toggleSidebar()
    })

    // Loading should never have been true during widget/UI changes
    expect(loadingStates.every((l) => l === false)).toBe(true)
  })
})
