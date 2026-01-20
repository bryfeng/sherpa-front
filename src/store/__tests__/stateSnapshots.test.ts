/**
 * State Snapshot Tests
 *
 * These tests verify the exact state changes for each action,
 * ensuring no unintended side effects on unrelated state slices.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useSherpaStore } from '../index'
import {
  resetStoreForTesting,
  createMockWidget,
  createStateSnapshot,
  UI_STABILITY_KEYS,
} from '../../test-utils/storeHelpers'

describe('Store State Snapshots', () => {
  beforeEach(() => {
    resetStoreForTesting()
  })

  describe('UI State Isolation', () => {
    it('chat actions should not affect widget panel state', () => {
      useSherpaStore.setState({
        isVisible: true,
        widgetTabs: ['w1'],
        activeWidgetId: 'w1',
      })

      const widgetStateBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgetTabs',
        'activeWidgetId',
        'panelWidth',
      ])

      // Perform chat actions
      act(() => {
        useSherpaStore.getState().addMessage({ id: 'm1', role: 'user', text: 'Hello' })
        useSherpaStore.getState().setIsTyping(true)
        useSherpaStore.getState().setInputValue('test')
      })

      const widgetStateAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgetTabs',
        'activeWidgetId',
        'panelWidth',
      ])

      expect(widgetStateAfter).toEqual(widgetStateBefore)
    })

    it('widget actions should not affect chat state', () => {
      useSherpaStore.setState({
        messages: [{ id: 'm1', role: 'assistant', text: 'Hi', timestamp: Date.now() }],
        isTyping: false,
        inputValue: 'draft message',
      })

      const chatStateBefore = createStateSnapshot(useSherpaStore.getState(), [
        'messages',
        'isTyping',
        'inputValue',
        'conversationId',
      ])

      // Perform widget actions
      const widget = createMockWidget({ id: 'test' })
      act(() => {
        useSherpaStore.getState().addWidget(widget)
        useSherpaStore.getState().toggleVisibility()
        useSherpaStore.getState().setActiveWidget('test')
      })

      const chatStateAfter = createStateSnapshot(useSherpaStore.getState(), [
        'messages',
        'isTyping',
        'inputValue',
        'conversationId',
      ])

      expect(chatStateAfter).toEqual(chatStateBefore)
    })

    it('sidebar toggle should not affect widget panel or chat', () => {
      const widget = createMockWidget({ id: 'test' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget],
        widgetTabs: ['test'],
        messages: [{ id: 'm1', role: 'user', text: 'Hello', timestamp: Date.now() }],
        sidebarVisible: false,
      })

      const combinedBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgetTabs',
        'messages',
      ])

      act(() => {
        useSherpaStore.getState().toggleSidebar()
      })

      const combinedAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgetTabs',
        'messages',
      ])

      expect(combinedAfter).toEqual(combinedBefore)
      expect(useSherpaStore.getState().sidebarVisible).toBe(true)
    })
  })

  describe('Modal State Isolation', () => {
    it('opening modals should not affect other UI state', () => {
      useSherpaStore.setState({
        isVisible: true,
        sidebarVisible: true,
      })

      const uiBefore = createStateSnapshot(useSherpaStore.getState(), UI_STABILITY_KEYS)

      act(() => {
        useSherpaStore.getState().openModal('swap', { from: 'ETH', to: 'USDC' })
      })

      const uiAfter = createStateSnapshot(useSherpaStore.getState(), UI_STABILITY_KEYS)

      expect(uiAfter).toEqual(uiBefore)
      expect(useSherpaStore.getState().modals.swap).toEqual({ from: 'ETH', to: 'USDC' })
    })

    it('closing all modals should not affect panel visibility', () => {
      useSherpaStore.setState({
        isVisible: true,
        modals: {
          swap: { from: 'ETH', to: 'USDC' },
          bridge: true,
          simulate: null,
          relay: false,
          expandedPanel: null,
          proInfo: false,
        },
      })

      act(() => {
        useSherpaStore.getState().closeAllModals()
      })

      expect(useSherpaStore.getState().isVisible).toBe(true)
    })
  })

  describe('Theme and Persona Isolation', () => {
    it('theme toggle should not affect any other state', () => {
      const widget = createMockWidget({ id: 'test' })
      useSherpaStore.setState({
        theme: 'dark',
        isVisible: true,
        widgets: [widget],
        messages: [{ id: 'm1', role: 'user', text: 'Hi', timestamp: Date.now() }],
      })

      const nonThemeBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgets',
        'messages',
        'persona',
      ])

      act(() => {
        useSherpaStore.getState().toggleTheme()
      })

      const nonThemeAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgets',
        'messages',
        'persona',
      ])

      expect(nonThemeAfter).toEqual(nonThemeBefore)
      expect(useSherpaStore.getState().theme).toBe('light')
    })

    it('persona change should not affect widget or chat state', () => {
      const widget = createMockWidget({ id: 'test' })
      useSherpaStore.setState({
        persona: 'friendly',
        isVisible: true,
        widgets: [widget],
        widgetTabs: ['test'],
      })

      const nonPersonaBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgets',
        'widgetTabs',
        'theme',
      ])

      act(() => {
        useSherpaStore.getState().setPersona('technical')
      })

      const nonPersonaAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgets',
        'widgetTabs',
        'theme',
      ])

      expect(nonPersonaAfter).toEqual(nonPersonaBefore)
      expect(useSherpaStore.getState().persona).toBe('technical')
    })
  })

  describe('Wallet State Isolation', () => {
    it('wallet connection should not affect UI panel states', () => {
      useSherpaStore.setState({
        isVisible: true,
        sidebarVisible: true,
        wallet: {
          address: null,
          chain: 'ethereum',
          isConnected: false,
          isManual: false,
        },
      })

      const uiBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'sidebarVisible',
        'widgetTabs',
      ])

      act(() => {
        useSherpaStore.getState().setWallet({
          address: '0x1234567890abcdef',
          isConnected: true,
        })
      })

      const uiAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'sidebarVisible',
        'widgetTabs',
      ])

      expect(uiAfter).toEqual(uiBefore)
    })

    it('clearWallet should not affect UI state', () => {
      useSherpaStore.setState({
        isVisible: true,
        sidebarVisible: true,
        wallet: {
          address: '0x123',
          chain: 'ethereum',
          isConnected: true,
          isManual: false,
        },
      })

      const uiBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'sidebarVisible',
      ])

      act(() => {
        useSherpaStore.getState().clearWallet()
      })

      const uiAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'sidebarVisible',
      ])

      expect(uiAfter).toEqual(uiBefore)
    })
  })

  describe('startNewChat Isolation', () => {
    it('startNewChat should not affect widget panel state', () => {
      const widget = createMockWidget({ id: 'test' })
      useSherpaStore.setState({
        isVisible: true,
        widgets: [widget],
        widgetTabs: ['test'],
        activeWidgetId: 'test',
        messages: [
          { id: 'm1', role: 'user', text: 'Old message', timestamp: Date.now() },
        ],
        conversationId: 'conv-123',
      })

      const widgetBefore = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgets',
        'widgetTabs',
        'activeWidgetId',
      ])

      act(() => {
        useSherpaStore.getState().startNewChat()
      })

      const widgetAfter = createStateSnapshot(useSherpaStore.getState(), [
        'isVisible',
        'widgets',
        'widgetTabs',
        'activeWidgetId',
      ])

      expect(widgetAfter).toEqual(widgetBefore)
      // But chat state should be reset
      expect(useSherpaStore.getState().conversationId).toBeNull()
    })
  })
})
