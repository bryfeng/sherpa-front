import type { WidgetAction } from '../../types/widgets'

export interface PanelControlsConfig {
  collapsed: boolean
  onToggleCollapse: () => void
  onExpand: () => void
}

export interface PanelControlsProps {
  widgetId: string
  widgetTitle: string
  index: number
  totalCount: number
  collapsed: boolean
  onToggleCollapse: () => void
  onExpand: () => void
  onMove: (direction: 'up' | 'down') => void
}

export function usePanelActions({
  widgetId,
  widgetTitle,
  index,
  totalCount,
  collapsed,
  onToggleCollapse,
  onExpand,
  onMove,
}: PanelControlsProps): WidgetAction[] {
  const actions: WidgetAction[] = [
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

  if (index > 0) {
    actions.push({
      id: `move-up-${widgetId}`,
      label: 'Move up',
      onClick: () => onMove('up'),
      ariaLabel: `Move ${widgetTitle} earlier`,
    })
  }

  if (index < totalCount - 1) {
    actions.push({
      id: `move-down-${widgetId}`,
      label: 'Move down',
      onClick: () => onMove('down'),
      ariaLabel: `Move ${widgetTitle} later`,
    })
  }

  return actions
}
