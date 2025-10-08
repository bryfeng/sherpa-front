/* eslint-disable react/prop-types */
import React from 'react'

type WidgetButtonVariant = 'primary' | 'secondary' | 'ghost'
type WidgetButtonSize = 'sm' | 'md'

type WidgetButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: WidgetButtonVariant
  size?: WidgetButtonSize
}

const widgetButtonBase = 'inline-flex items-center justify-center gap-2 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60'

const widgetButtonVariants: Record<WidgetButtonVariant, string> = {
  primary: 'border-primary-500 bg-primary-600 text-white hover:opacity-95',
  secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100',
}

const widgetButtonSizes: Record<WidgetButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
}

export const WidgetButton = React.forwardRef<HTMLButtonElement, WidgetButtonProps>(
  function WidgetButton({ variant = 'primary', size = 'sm', className = '', type = 'button', children, ...rest }, ref) {
    const composed = `${widgetButtonBase} ${widgetButtonVariants[variant]} ${widgetButtonSizes[size]} ${className}`
    return (
      <button ref={ref} type={type} className={composed} {...rest}>
        {children}
      </button>
    )
  },
)

WidgetButton.displayName = 'WidgetButton'

export type WidgetSurfaceTone = 'default' | 'accent' | 'muted' | 'warning' | 'danger'

export type WidgetSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: WidgetSurfaceTone
  padding?: 'none' | 'sm' | 'md'
  shadow?: boolean
  border?: boolean
}

const surfaceToneStyles: Record<WidgetSurfaceTone, string> = {
  default: 'bg-white text-slate-700',
  accent: 'bg-primary-50/60 text-primary-900',
  muted: 'bg-slate-50 text-slate-600',
  warning: 'bg-amber-50/80 text-amber-900',
  danger: 'bg-rose-50 text-rose-900',
}

const surfaceBorderStyles: Record<WidgetSurfaceTone, string> = {
  default: 'border-slate-200',
  accent: 'border-primary-200',
  muted: 'border-slate-200',
  warning: 'border-amber-200',
  danger: 'border-rose-200',
}

const paddingStyles: Record<NonNullable<WidgetSurfaceProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
}

export function WidgetSurface({
  tone = 'default',
  padding = 'md',
  shadow = false,
  border = true,
  className = '',
  children,
  ...rest
}: WidgetSurfaceProps) {
  const toneClass = surfaceToneStyles[tone] || surfaceToneStyles.default
  const paddingClass = paddingStyles[padding] || paddingStyles.md
  const borderDetail = surfaceBorderStyles[tone] || surfaceBorderStyles.default
  const borderClass = border ? `border ${borderDetail}` : ''
  const composed = `rounded-2xl ${borderClass} ${toneClass} ${paddingClass}${shadow ? ' shadow-sm' : ''}`.trim()
  const merged = `${composed}${className ? ` ${className}` : ''}`
  return (
    <div className={merged} {...rest}>
      {children}
    </div>
  )
}

export type WidgetCardProps = WidgetSurfaceProps

export function WidgetCard(props: WidgetCardProps) {
  return <WidgetSurface shadow {...props} />
}

export type WidgetSectionProps = WidgetSurfaceProps

export function WidgetSection({ padding = 'sm', ...rest }: WidgetSectionProps) {
  return <WidgetSurface padding={padding} {...rest} />
}

export function WidgetHeader({
  title,
  subtitle,
  actions,
  icon,
  className = '',
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">{icon}</span>}
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function WidgetStatGrid({ children, columns = 2 }: { children: React.ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  const columnClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-4'
  return <div className={`grid gap-3 ${columnClass}`}>{children}</div>
}

export function WidgetStat({
  label,
  value,
  helper,
  helperTone = 'muted',
  tone = 'default',
  className = '',
}: {
  label: React.ReactNode
  value: React.ReactNode
  helper?: React.ReactNode
  helperTone?: 'muted' | 'default'
  tone?: WidgetSurfaceTone
  className?: string
}) {
  const helperClass = helperTone === 'muted' ? 'text-xs text-slate-500' : 'text-xs text-slate-700'
  return (
    <WidgetSection className={className} padding="sm" tone={tone}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      {helper && <div className={helperClass}>{helper}</div>}
    </WidgetSection>
  )
}
