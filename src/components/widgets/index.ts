/**
 * WIDGET SYSTEM - Component Exports
 *
 * Central export point for all widget components.
 */

// Base components
export { WidgetBase } from './WidgetBase'
export { WidgetGrid } from './WidgetGrid'
export { WidgetPicker } from './WidgetPicker'

// Widget content components
export {
  WidgetContent,
  PortfolioSummaryWidget,
  PriceTickerWidget,
  PriceChartWidget,
  SwapWidget,
  AISummaryWidget,
  GasTrackerWidget,
  NotesWidget,
  WatchlistWidget,
} from './WidgetContents'

// Re-export types for convenience
export type {
  Widget,
  WidgetKind,
  WidgetCategory,
  WidgetSize,
  WidgetSizePreset,
  WidgetDisplayState,
  WidgetAction,
  WidgetPayloads,
  WorkspacePreset,
} from '../../types/widget-system'

// Re-export registry utilities
export {
  WIDGET_REGISTRY,
  WIDGET_CATEGORIES,
  createWidget,
  getWidgetMetadata,
  getWidgetsByCategory,
  searchWidgets,
  isWidgetStale,
  needsAutoRefresh,
  duplicateWidget,
} from '../../lib/widget-registry'

// Re-export store hooks
export {
  useWidgetStore,
  useWidgets,
  useActiveWidget,
  useWidgetById,
  useWorkspaceLayout,
  useWidgetPicker,
} from '../../store/widget-store'
