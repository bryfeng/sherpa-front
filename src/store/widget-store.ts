/**
 * WIDGET STORE
 *
 * Zustand store slice for managing workspace widgets.
 * Handles widget CRUD, layout, and interactions.
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import type {
  Widget,
  WidgetCategory,
  WidgetSize,
  WidgetDisplayState,
  WidgetAction,
  WidgetLink,
  WorkspacePreset,
} from '../types/widget-system'
import { WORKSPACE_PRESETS } from '../types/widget-system'
import {
  createWidget,
  duplicateWidget,
  getWidgetMetadata,
  type CreateWidgetOptions,
} from '../lib/widget-registry'

// ============================================
// TYPES
// ============================================

export interface WorkspaceLayout {
  columns: number
  rowHeight: number
  gap: number
}

export interface WidgetStoreState {
  // Widgets
  widgets: Widget[]
  activeWidgetId: string | null
  selectedWidgetIds: string[]

  // Widget linking
  links: WidgetLink[]

  // Layout
  layout: WorkspaceLayout
  isGridLocked: boolean

  // UI State
  isWidgetPickerOpen: boolean
  widgetPickerCategory: WidgetCategory | null
  isConfigModalOpen: boolean
  configModalWidgetId: string | null

  // Presets
  currentPresetId: string | null
}

export interface WidgetStoreActions {
  // Widget CRUD
  addWidget: (options: CreateWidgetOptions) => Widget
  addWidgets: (widgets: Widget[]) => void
  removeWidget: (widgetId: string) => void
  removeWidgets: (widgetIds: string[]) => void
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void
  duplicateWidget: (widgetId: string) => Widget | null
  clearWorkspace: () => void

  // Widget state updates
  setWidgetState: (widgetId: string, state: Widget['state'], error?: string) => void
  setWidgetPayload: (widgetId: string, payload: Record<string, unknown>) => void
  setWidgetDisplay: (widgetId: string, display: Partial<WidgetDisplayState>) => void
  refreshWidget: (widgetId: string) => void
  markWidgetRefreshed: (widgetId: string) => void

  // Widget actions
  performWidgetAction: (widgetId: string, action: WidgetAction) => void
  pinWidget: (widgetId: string) => void
  unpinWidget: (widgetId: string) => void
  collapseWidget: (widgetId: string) => void
  expandWidget: (widgetId: string) => void
  resizeWidget: (widgetId: string, size: WidgetSize) => void

  // Selection
  setActiveWidget: (widgetId: string | null) => void
  selectWidget: (widgetId: string, multiSelect?: boolean) => void
  deselectWidget: (widgetId: string) => void
  clearSelection: () => void

  // Layout
  moveWidget: (widgetId: string, position: { col: number; row: number }) => void
  reorderWidgets: (fromIndex: number, toIndex: number) => void
  setLayout: (layout: Partial<WorkspaceLayout>) => void
  toggleGridLock: () => void
  autoArrangeWidgets: () => void

  // Widget linking
  linkWidgets: (sourceId: string, targetId: string, linkType: WidgetLink['linkType']) => void
  unlinkWidgets: (sourceId: string, targetId: string) => void
  clearWidgetLinks: (widgetId: string) => void

  // Presets
  applyPreset: (presetId: string) => void
  saveAsPreset: (name: string, description: string) => WorkspacePreset

  // Widget picker
  openWidgetPicker: (category?: WidgetCategory) => void
  closeWidgetPicker: () => void

  // Config modal
  openConfigModal: (widgetId: string) => void
  closeConfigModal: () => void

  // Computed getters (as functions for use in selectors)
  getWidget: (widgetId: string) => Widget | undefined
  getWidgetsByCategory: (category: WidgetCategory) => Widget[]
  getPinnedWidgets: () => Widget[]
  getLinkedWidgets: (widgetId: string) => Widget[]
}

export type WidgetStore = WidgetStoreState & WidgetStoreActions

// ============================================
// DEFAULT STATE
// ============================================

const DEFAULT_LAYOUT: WorkspaceLayout = {
  columns: 12,
  rowHeight: 150,
  gap: 16,
}

const DEFAULT_STATE: WidgetStoreState = {
  widgets: [],
  activeWidgetId: null,
  selectedWidgetIds: [],
  links: [],
  layout: DEFAULT_LAYOUT,
  isGridLocked: false,
  isWidgetPickerOpen: false,
  widgetPickerCategory: null,
  isConfigModalOpen: false,
  configModalWidgetId: null,
  currentPresetId: null,
}

// ============================================
// STORE
// ============================================

export const useWidgetStore = create<WidgetStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          ...DEFAULT_STATE,

          // ===== WIDGET CRUD =====

          addWidget: (options: CreateWidgetOptions) => {
            const widget = createWidget(options)
            set((state) => ({
              widgets: [...state.widgets, widget],
            }))
            return widget
          },

          addWidgets: (widgets) => {
            set((state) => ({
              widgets: [...state.widgets, ...widgets],
            }))
          },

          removeWidget: (widgetId) => {
            set((state) => ({
              widgets: state.widgets.filter((w) => w.id !== widgetId),
              links: state.links.filter(
                (l) => l.sourceId !== widgetId && l.targetId !== widgetId
              ),
              selectedWidgetIds: state.selectedWidgetIds.filter((id) => id !== widgetId),
              activeWidgetId: state.activeWidgetId === widgetId ? null : state.activeWidgetId,
            }))
          },

          removeWidgets: (widgetIds) => {
            set((state) => ({
              widgets: state.widgets.filter((w) => !widgetIds.includes(w.id)),
              links: state.links.filter(
                (l) => !widgetIds.includes(l.sourceId) && !widgetIds.includes(l.targetId)
              ),
              selectedWidgetIds: state.selectedWidgetIds.filter((id) => !widgetIds.includes(id)),
              activeWidgetId: state.activeWidgetId && widgetIds.includes(state.activeWidgetId)
                ? null
                : state.activeWidgetId,
            }))
          },

          updateWidget: (widgetId, updates) => {
            set((state) => ({
              widgets: state.widgets.map((w) =>
                w.id === widgetId ? { ...w, ...updates } : w
              ),
            }))
          },

          duplicateWidget: (widgetId) => {
            const widget = get().widgets.find((w) => w.id === widgetId)
            if (!widget) return null

            const newWidget = duplicateWidget(widget)
            set((state) => ({
              widgets: [...state.widgets, newWidget],
            }))
            return newWidget
          },

          clearWorkspace: () => {
            set({
              widgets: [],
              links: [],
              activeWidgetId: null,
              selectedWidgetIds: [],
              currentPresetId: null,
            })
          },

          // ===== WIDGET STATE UPDATES =====

          setWidgetState: (widgetId, state, error) => {
            set((s) => ({
              widgets: s.widgets.map((w) =>
                w.id === widgetId ? { ...w, state, error } : w
              ),
            }))
          },

          setWidgetPayload: (widgetId, payload) => {
            set((s) => ({
              widgets: s.widgets.map((w) =>
                w.id === widgetId
                  ? { ...w, payload: { ...w.payload, ...payload } }
                  : w
              ),
            }))
          },

          setWidgetDisplay: (widgetId, display) => {
            set((s) => ({
              widgets: s.widgets.map((w) =>
                w.id === widgetId
                  ? { ...w, display: { ...w.display, ...display } }
                  : w
              ),
            }))
          },

          refreshWidget: (widgetId) => {
            set((s) => ({
              widgets: s.widgets.map((w) =>
                w.id === widgetId ? { ...w, state: 'refreshing' } : w
              ),
            }))
          },

          markWidgetRefreshed: (widgetId) => {
            set((s) => ({
              widgets: s.widgets.map((w) =>
                w.id === widgetId
                  ? {
                      ...w,
                      state: 'ready',
                      refresh: {
                        ...w.refresh,
                        lastRefreshedAt: Date.now(),
                      },
                    }
                  : w
              ),
            }))
          },

          // ===== WIDGET ACTIONS =====

          performWidgetAction: (widgetId, action) => {
            const { updateWidget, pinWidget, unpinWidget, collapseWidget, expandWidget, removeWidget, duplicateWidget: dupWidget, openConfigModal, refreshWidget } = get()

            switch (action) {
              case 'pin':
                pinWidget(widgetId)
                break
              case 'unpin':
                unpinWidget(widgetId)
                break
              case 'collapse':
                collapseWidget(widgetId)
                break
              case 'expand':
                expandWidget(widgetId)
                break
              case 'remove':
                removeWidget(widgetId)
                break
              case 'duplicate':
                dupWidget(widgetId)
                break
              case 'configure':
                openConfigModal(widgetId)
                break
              case 'refresh':
                refreshWidget(widgetId)
                break
            }
          },

          pinWidget: (widgetId) => {
            get().setWidgetDisplay(widgetId, { pinned: true })
          },

          unpinWidget: (widgetId) => {
            get().setWidgetDisplay(widgetId, { pinned: false })
          },

          collapseWidget: (widgetId) => {
            get().setWidgetDisplay(widgetId, { collapsed: true })
          },

          expandWidget: (widgetId) => {
            get().setWidgetDisplay(widgetId, { collapsed: false })
          },

          resizeWidget: (widgetId, size) => {
            const widget = get().widgets.find((w) => w.id === widgetId)
            if (!widget) return

            const metadata = getWidgetMetadata(widget.kind)

            // Clamp to min/max
            const clampedSize: WidgetSize = {
              cols: Math.max(metadata.minSize.cols, Math.min(metadata.maxSize.cols, size.cols)) as WidgetSize['cols'],
              rows: Math.max(metadata.minSize.rows, Math.min(metadata.maxSize.rows, size.rows)) as WidgetSize['rows'],
            }

            get().updateWidget(widgetId, { size: clampedSize })
          },

          // ===== SELECTION =====

          setActiveWidget: (widgetId) => {
            set({ activeWidgetId: widgetId })
          },

          selectWidget: (widgetId, multiSelect = false) => {
            set((s) => ({
              activeWidgetId: widgetId,
              selectedWidgetIds: multiSelect
                ? s.selectedWidgetIds.includes(widgetId)
                  ? s.selectedWidgetIds
                  : [...s.selectedWidgetIds, widgetId]
                : [widgetId],
            }))
          },

          deselectWidget: (widgetId) => {
            set((s) => ({
              selectedWidgetIds: s.selectedWidgetIds.filter((id) => id !== widgetId),
              activeWidgetId: s.activeWidgetId === widgetId ? null : s.activeWidgetId,
            }))
          },

          clearSelection: () => {
            set({
              selectedWidgetIds: [],
              activeWidgetId: null,
            })
          },

          // ===== LAYOUT =====

          moveWidget: (widgetId, position) => {
            get().updateWidget(widgetId, { position })
          },

          reorderWidgets: (fromIndex, toIndex) => {
            set((s) => {
              const widgets = [...s.widgets]
              const [removed] = widgets.splice(fromIndex, 1)
              widgets.splice(toIndex, 0, removed)
              return { widgets }
            })
          },

          setLayout: (layout) => {
            set((s) => ({
              layout: { ...s.layout, ...layout },
            }))
          },

          toggleGridLock: () => {
            set((s) => ({ isGridLocked: !s.isGridLocked }))
          },

          autoArrangeWidgets: () => {
            const { widgets, layout } = get()
            let currentRow = 0
            let currentCol = 0

            // Sort by pinned first, then by creation time
            const sortedWidgets = [...widgets].sort((a, b) => {
              if (a.display.pinned && !b.display.pinned) return -1
              if (!a.display.pinned && b.display.pinned) return 1
              return a.createdAt - b.createdAt
            })

            const arrangedWidgets = sortedWidgets.map((widget) => {
              // If widget doesn't fit on current row, move to next
              if (currentCol + widget.size.cols > layout.columns) {
                currentCol = 0
                currentRow += 1 // Simplified: assume rows are 1 unit
              }

              const position = { col: currentCol, row: currentRow }
              currentCol += widget.size.cols

              return { ...widget, position }
            })

            set({ widgets: arrangedWidgets })
          },

          // ===== WIDGET LINKING =====

          linkWidgets: (sourceId, targetId, linkType) => {
            set((s) => ({
              links: [
                ...s.links.filter(
                  (l) => !(l.sourceId === sourceId && l.targetId === targetId && l.linkType === linkType)
                ),
                { sourceId, targetId, linkType },
              ],
            }))
          },

          unlinkWidgets: (sourceId, targetId) => {
            set((s) => ({
              links: s.links.filter(
                (l) => !(l.sourceId === sourceId && l.targetId === targetId)
              ),
            }))
          },

          clearWidgetLinks: (widgetId) => {
            set((s) => ({
              links: s.links.filter(
                (l) => l.sourceId !== widgetId && l.targetId !== widgetId
              ),
            }))
          },

          // ===== PRESETS =====

          applyPreset: (presetId) => {
            const preset = WORKSPACE_PRESETS.find((p) => p.id === presetId)
            if (!preset) return

            // Clear current workspace
            set({
              widgets: [],
              links: [],
              currentPresetId: presetId,
            })

            // Add widgets from preset
            preset.widgets.forEach((widgetConfig) => {
              get().addWidget({
                kind: widgetConfig.kind,
                title: widgetConfig.title,
                position: widgetConfig.position,
                size: widgetConfig.size,
                payload: widgetConfig.payload as any,
              })
            })
          },

          saveAsPreset: (name, description) => {
            const { widgets } = get()
            const preset: WorkspacePreset = {
              id: `custom_${Date.now()}`,
              name,
              description,
              icon: 'layout',
              widgets: widgets.map((w) => ({
                kind: w.kind,
                title: w.title,
                category: w.category,
                size: w.size,
                position: w.position,
                display: w.display,
                refresh: w.refresh,
                payload: w.payload,
              })),
            }
            // In a real app, save to localStorage or API
            return preset
          },

          // ===== WIDGET PICKER =====

          openWidgetPicker: (category) => {
            set({
              isWidgetPickerOpen: true,
              widgetPickerCategory: category ?? null,
            })
          },

          closeWidgetPicker: () => {
            set({
              isWidgetPickerOpen: false,
              widgetPickerCategory: null,
            })
          },

          // ===== CONFIG MODAL =====

          openConfigModal: (widgetId) => {
            set({
              isConfigModalOpen: true,
              configModalWidgetId: widgetId,
            })
          },

          closeConfigModal: () => {
            set({
              isConfigModalOpen: false,
              configModalWidgetId: null,
            })
          },

          // ===== COMPUTED GETTERS =====

          getWidget: (widgetId) => {
            return get().widgets.find((w) => w.id === widgetId)
          },

          getWidgetsByCategory: (category) => {
            return get().widgets.filter((w) => w.category === category)
          },

          getPinnedWidgets: () => {
            return get().widgets.filter((w) => w.display.pinned)
          },

          getLinkedWidgets: (widgetId) => {
            const { widgets, links } = get()
            const linkedIds = links
              .filter((l) => l.sourceId === widgetId || l.targetId === widgetId)
              .map((l) => (l.sourceId === widgetId ? l.targetId : l.sourceId))
            return widgets.filter((w) => linkedIds.includes(w.id))
          },
        }),
        {
          name: 'sherpa-widgets',
          partialize: (state) => ({
            widgets: state.widgets,
            links: state.links,
            layout: state.layout,
            isGridLocked: state.isGridLocked,
            currentPresetId: state.currentPresetId,
          }),
        }
      )
    ),
    { name: 'WidgetStore' }
  )
)

// ============================================
// CONVENIENCE HOOKS
// ============================================

export function useWidgets() {
  return useWidgetStore((s) => s.widgets)
}

export function useActiveWidget() {
  const activeId = useWidgetStore((s) => s.activeWidgetId)
  const widgets = useWidgetStore((s) => s.widgets)
  return widgets.find((w) => w.id === activeId) ?? null
}

export function useWidgetById(widgetId: string) {
  return useWidgetStore((s) => s.widgets.find((w) => w.id === widgetId))
}

export function useWorkspaceLayout() {
  const layout = useWidgetStore((s) => s.layout)
  const isLocked = useWidgetStore((s) => s.isGridLocked)
  const setLayout = useWidgetStore((s) => s.setLayout)
  const toggleLock = useWidgetStore((s) => s.toggleGridLock)
  return { layout, isLocked, setLayout, toggleLock }
}

export function useWidgetPicker() {
  const isOpen = useWidgetStore((s) => s.isWidgetPickerOpen)
  const category = useWidgetStore((s) => s.widgetPickerCategory)
  const open = useWidgetStore((s) => s.openWidgetPicker)
  const close = useWidgetStore((s) => s.closeWidgetPicker)
  return { isOpen, category, open, close }
}
