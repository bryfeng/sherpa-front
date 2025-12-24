import type { WidgetAction } from '../../types/widgets'

export interface PanelControlsConfig {
  collapsed: boolean
  onToggleCollapse: () => void
  onExpand: () => void
}

export interface PanelControlsProps {
  widgetId: string
  widgetTitle: string
  collapsed: boolean
  onToggleCollapse: () => void
  onExpand: () => void
}

export function usePanelActions({
  widgetId,
  widgetTitle,
  collapsed,
  onToggleCollapse,
  onExpand,
}: PanelControlsProps): WidgetAction[] {
  return [
    {
      id: `pin-${widgetId}`,
      label: collapsed ? 'Unpin' : 'Pin',
      onClick: onToggleCollapse,
      ariaLabel: collapsed ? `Unpin ${widgetTitle}` : `Pin ${widgetTitle}`,
    },
    {
      id: `expand-${widgetId}`,
      label: 'Expand',
      onClick: onExpand,
      ariaLabel: `Expand ${widgetTitle}`,
    },
  ]
}
