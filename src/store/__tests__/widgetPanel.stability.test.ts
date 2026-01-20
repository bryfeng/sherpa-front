/**
 * Widget Panel Stability Tests
 *
 * These tests ensure that the widget panel UI state (visibility, active tab, etc.)
 * remains stable when data refreshes occur. This prevents bugs like the panel
 * reopening when trending tokens API refreshes.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useSherpaStore } from '../index'
import {
  resetStoreForTesting,
  createMockWidget,
  expectNoStateChange,
  WIDGET_PANEL_UI_KEYS,
} from '../../test-utils/storeHelpers'

describe('Widget Panel Stability', () => {
  beforeEach(() => {
    resetStoreForTesting()
  })

  describe('addWidget - existing widget updates', () => {
    it('should NOT change visibility when updating existing widget', () => {
      // Setup: Panel is CLOSED with an existing widget
      const existingWidget = createMockWidget({ id: 'trending-tokens', kind: 'trending-tokens' })
      useSherpaStore.setState({
        isVisible: false,
        widgets: [existingWidget],
        widgetTabs: ['trending-tokens'],
        activeWidgetId: 'trending-tokens',
      })

      expect(useSherpaStore.getState().isVisible).toBe(false)

      // Action: Update the existing widget (simulates data refresh)
      act(() => {
        useSherpaStore.getState().addWidget({
          ...existingWidget,
          title: 'Updated Trending Tokens',
          payload: { lastUpdated: Date.now() },
        })
      })

      // Assert: Panel should STILL be closed
      expect(useSherpaStore.getState().isVisible).toBe(false)
    })

    it('should NOT change visibility when panel is OPEN and widget updates', () => {
      // Setup: Panel is OPEN with an existing widget
      const existingWidget = createMockWidget({ id: 'portfolio', kind: 'portfolio' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [existingWidget],
        widgetTabs: ['portfolio'],
        activeWidgetId: 'portfolio',
      })

      expect(useSherpaStore.getState().isVisible).toBe(true)

      // Action: Update the existing widget
      act(() => {
        useSherpaStore.getState().addWidget({
          ...existingWidget,
          payload: { totalValue: 1234.56 },
        })
      })

      // Assert: Panel should STILL be open
      expect(useSherpaStore.getState().isVisible).toBe(true)
    })

    it('should preserve activeWidgetId when updating a different widget', () => {
      // Setup: Two widgets, first one is active
      const widget1 = createMockWidget({ id: 'widget-1', kind: 'chart' })
      const widget2 = createMockWidget({ id: 'widget-2', kind: 'trending-tokens' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget1, widget2],
        widgetTabs: ['widget-1', 'widget-2'],
        activeWidgetId: 'widget-1',
      })

      // Action: Update widget-2 (not the active one)
      act(() => {
        useSherpaStore.getState().addWidget({
          ...widget2,
          payload: { updated: true },
        })
      })

      // Assert: activeWidgetId should still be widget-1
      expect(useSherpaStore.getState().activeWidgetId).toBe('widget-1')
    })

    it('should NOT affect widget tabs order when updating', () => {
      const widget1 = createMockWidget({ id: 'w1' })
      const widget2 = createMockWidget({ id: 'w2' })
      const widget3 = createMockWidget({ id: 'w3' })

      useSherpaStore.setState({
        widgets: [widget1, widget2, widget3],
        widgetTabs: ['w1', 'w2', 'w3'],
      })

      const tabsBefore = [...useSherpaStore.getState().widgetTabs]

      // Update middle widget
      act(() => {
        useSherpaStore.getState().addWidget({ ...widget2, title: 'Updated' })
      })

      expect(useSherpaStore.getState().widgetTabs).toEqual(tabsBefore)
    })
  })

  describe('addWidget - new widget', () => {
    it('should show panel when adding NEW widget', () => {
      // Setup: Panel is closed, no widgets
      useSherpaStore.setState({
        isVisible: false,
        widgets: [],
        widgetTabs: [],
      })

      // Action: Add a new widget
      const newWidget = createMockWidget({ id: 'new-widget' })
      act(() => {
        useSherpaStore.getState().addWidget(newWidget)
      })

      // Assert: Panel should now be visible
      expect(useSherpaStore.getState().isVisible).toBe(true)
      expect(useSherpaStore.getState().activeWidgetId).toBe('new-widget')
    })

    it('should add new widget to tabs and set as active', () => {
      // Setup: One existing widget
      const existingWidget = createMockWidget({ id: 'existing' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [existingWidget],
        widgetTabs: ['existing'],
        activeWidgetId: 'existing',
      })

      // Action: Add a new widget
      const newWidget = createMockWidget({ id: 'new-widget' })
      act(() => {
        useSherpaStore.getState().addWidget(newWidget)
      })

      // Assert: New widget should be in tabs and active
      expect(useSherpaStore.getState().widgetTabs).toContain('new-widget')
      expect(useSherpaStore.getState().activeWidgetId).toBe('new-widget')
    })
  })

  describe('toggleVisibility', () => {
    it('should toggle panel visibility', () => {
      useSherpaStore.setState({ isVisible: false })

      act(() => {
        useSherpaStore.getState().toggleVisibility()
      })
      expect(useSherpaStore.getState().isVisible).toBe(true)

      act(() => {
        useSherpaStore.getState().toggleVisibility()
      })
      expect(useSherpaStore.getState().isVisible).toBe(false)
    })

    it('should NOT affect widgets or tabs when toggling', () => {
      const widget = createMockWidget({ id: 'test' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget],
        widgetTabs: ['test'],
        activeWidgetId: 'test',
      })

      expectNoStateChange(
        () => useSherpaStore.getState(),
        () => {
          act(() => {
            useSherpaStore.getState().toggleVisibility()
          })
        },
        ['widgets', 'widgetTabs', 'activeWidgetId']
      )
    })
  })

  describe('closeWidgetTab', () => {
    it('should hide panel when closing last tab', () => {
      const widget = createMockWidget({ id: 'only-widget' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget],
        widgetTabs: ['only-widget'],
        activeWidgetId: 'only-widget',
      })

      act(() => {
        useSherpaStore.getState().closeWidgetTab('only-widget')
      })

      expect(useSherpaStore.getState().isVisible).toBe(false)
      expect(useSherpaStore.getState().widgetTabs).toHaveLength(0)
    })

    it('should keep panel open when closing non-last tab', () => {
      const widget1 = createMockWidget({ id: 'w1' })
      const widget2 = createMockWidget({ id: 'w2' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget1, widget2],
        widgetTabs: ['w1', 'w2'],
        activeWidgetId: 'w1',
      })

      act(() => {
        useSherpaStore.getState().closeWidgetTab('w1')
      })

      expect(useSherpaStore.getState().isVisible).toBe(true)
      expect(useSherpaStore.getState().widgetTabs).toEqual(['w2'])
      expect(useSherpaStore.getState().activeWidgetId).toBe('w2')
    })
  })

  describe('updateWidget', () => {
    it('should NOT change any UI state when updating widget', () => {
      const widget = createMockWidget({ id: 'test', title: 'Original' })
      useSherpaStore.setState({
        isVisible: false,
        widgets: [widget],
        widgetTabs: ['test'],
        activeWidgetId: 'test',
      })

      expectNoStateChange(
        () => useSherpaStore.getState(),
        () => {
          act(() => {
            useSherpaStore.getState().updateWidget('test', { title: 'Updated' })
          })
        },
        [...WIDGET_PANEL_UI_KEYS, 'widgetTabs', 'activeWidgetId']
      )

      // But the widget data should be updated
      expect(useSherpaStore.getState().widgets[0].title).toBe('Updated')
    })
  })

  describe('rapid data refreshes (polling simulation)', () => {
    it('should maintain closed state through multiple rapid updates', () => {
      const widget = createMockWidget({ id: 'polling-widget', kind: 'trending-tokens' })
      useSherpaStore.setState({
        isVisible: false,
        widgets: [widget],
        widgetTabs: ['polling-widget'],
        activeWidgetId: 'polling-widget',
      })

      // Simulate 10 rapid API polling updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          useSherpaStore.getState().addWidget({
            ...widget,
            payload: { iteration: i, timestamp: Date.now() },
          })
        })
      }

      // Panel should still be closed after all updates
      expect(useSherpaStore.getState().isVisible).toBe(false)
    })

    it('should maintain open state through multiple rapid updates', () => {
      const widget = createMockWidget({ id: 'polling-widget' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget],
        widgetTabs: ['polling-widget'],
        activeWidgetId: 'polling-widget',
      })

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          useSherpaStore.getState().addWidget({
            ...widget,
            payload: { iteration: i },
          })
        })
      }

      // Panel should still be open
      expect(useSherpaStore.getState().isVisible).toBe(true)
    })
  })
})
