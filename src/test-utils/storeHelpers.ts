/**
 * Test utilities for Zustand store state assertions.
 *
 * These helpers make it easy to verify that actions don't
 * cause unintended side effects on unrelated state.
 */

import { expect } from 'vitest'
import { useSherpaStore, type SherpaStore } from '../store'

/**
 * Keys that should typically remain stable during data refreshes.
 * These are UI state values that shouldn't change when backend data updates.
 */
export const UI_STABILITY_KEYS: (keyof SherpaStore)[] = [
  'isVisible',
  'sidebarVisible',
  'theme',
  'persona',
]

/**
 * Keys related to widget panel UI state.
 */
export const WIDGET_PANEL_UI_KEYS: (keyof SherpaStore)[] = [
  'isVisible',
  'panelWidth',
]

/**
 * Assert that specific store keys don't change when an action is performed.
 *
 * @example
 * ```ts
 * expectNoStateChange(
 *   () => useSherpaStore.getState(),
 *   () => useSherpaStore.getState().addWidget(existingWidget),
 *   ['isVisible', 'sidebarVisible']
 * )
 * ```
 */
export function expectNoStateChange<T extends Record<string, unknown>>(
  getState: () => T,
  action: () => void,
  keysToCheck: (keyof T)[]
): void {
  const before: Partial<T> = {}
  for (const key of keysToCheck) {
    before[key] = getState()[key]
  }

  action()

  const after = getState()
  for (const key of keysToCheck) {
    expect(after[key], `Expected ${String(key)} to remain unchanged`).toEqual(before[key])
  }
}

/**
 * Assert that specific store keys DO change when an action is performed.
 *
 * @example
 * ```ts
 * expectStateChange(
 *   () => useSherpaStore.getState(),
 *   () => useSherpaStore.getState().addWidget(newWidget),
 *   ['widgets', 'widgetTabs']
 * )
 * ```
 */
export function expectStateChange<T extends Record<string, unknown>>(
  getState: () => T,
  action: () => void,
  keysToCheck: (keyof T)[]
): void {
  const before: Partial<T> = {}
  for (const key of keysToCheck) {
    before[key] = getState()[key]
  }

  action()

  const after = getState()
  for (const key of keysToCheck) {
    expect(after[key], `Expected ${String(key)} to change`).not.toEqual(before[key])
  }
}

/**
 * Create a snapshot of specific store keys for comparison.
 */
export function createStateSnapshot<T extends Record<string, unknown>>(
  state: T,
  keys: (keyof T)[]
): Partial<T> {
  const snapshot: Partial<T> = {}
  for (const key of keys) {
    snapshot[key] = state[key]
  }
  return snapshot
}

/**
 * Reset the store to a known state for testing.
 * Call this in beforeEach to ensure test isolation.
 */
export function resetStoreForTesting(overrides: Partial<SherpaStore> = {}): void {
  useSherpaStore.setState({
    // UI state
    isVisible: false,
    sidebarVisible: false,
    theme: 'dark',
    persona: 'friendly',

    // Widget state
    widgets: [],
    widgetTabs: [],
    activeWidgetId: null,
    panelWidth: 500,
    highlightedWidgets: [],
    collapsedPanels: {},

    // Chat state
    messages: [],
    isTyping: false,
    inputValue: '',
    conversationId: null,

    // Modals
    modals: {
      simulate: null,
      swap: null,
      bridge: false,
      relay: false,
      expandedPanel: null,
      proInfo: false,
    },

    // Apply any overrides
    ...overrides,
  })
}

/**
 * Create a mock widget for testing.
 */
export function createMockWidget(overrides: Partial<{
  id: string
  kind: string
  title: string
  payload: Record<string, unknown>
}> = {}) {
  return {
    id: overrides.id ?? `widget-${Date.now()}`,
    kind: overrides.kind ?? 'chart',
    title: overrides.title ?? 'Test Widget',
    payload: overrides.payload ?? {},
    sources: [],
    density: 'compact' as const,
  }
}

/**
 * Track render counts for a component.
 * Useful for detecting unnecessary re-renders.
 */
export function createRenderTracker() {
  let count = 0
  return {
    increment: () => ++count,
    get count() {
      return count
    },
    reset: () => {
      count = 0
    },
  }
}

/**
 * Wait for store state to match a condition.
 * Useful for async state changes.
 */
export async function waitForStoreState<T>(
  selector: (state: SherpaStore) => T,
  condition: (value: T) => boolean,
  timeout = 1000
): Promise<T> {
  const start = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      const value = selector(useSherpaStore.getState())
      if (condition(value)) {
        resolve(value)
        return
      }
      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for store state condition`))
        return
      }
      setTimeout(check, 10)
    }
    check()
  })
}
