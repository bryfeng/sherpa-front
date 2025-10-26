export type WidgetDensity = 'rail' | 'full'

export type WidgetAction = {
  id: string
  label: string
  onClick: () => void
  ariaLabel?: string
}

export type Widget<T = Record<string, any>> = {
  id: string
  kind: string
  title: string
  payload: T
  sources?: Array<{ label: string; href?: string }>
  density: WidgetDensity
  order?: number
}
