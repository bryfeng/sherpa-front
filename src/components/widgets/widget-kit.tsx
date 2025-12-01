/* eslint-disable react/prop-types */
import React from 'react'

type WidgetButtonVariant = 'primary' | 'secondary' | 'ghost'
type WidgetButtonSize = 'sm' | 'md'

type WidgetButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: WidgetButtonVariant
  size?: WidgetButtonSize
}

const widgetButtonBase = 'inline-flex items-center justify-center gap-2 rounded-full border transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60'

const widgetButtonVariants: Record<WidgetButtonVariant, string> = {
  primary: 'border-transparent bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-600)] active:bg-[var(--accent-700)]',
  secondary: 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--hover)] active:bg-[var(--active)]',
  ghost: 'border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--hover)] active:bg-[var(--active)]',
}

const widgetButtonSizes: Record<WidgetButtonSize, string> = {
  sm: 'px-[var(--s1)] py-[var(--s-1)] text-xs',
  md: 'px-[var(--s2)] py-[var(--s1)] text-sm',
}

export const WidgetButton = React.forwardRef<HTMLButtonElement, WidgetButtonProps>(
  function WidgetButton({ variant = 'primary', size = 'sm', className = '', type = 'button', children, ...rest }, ref) {
    const composed = `${widgetButtonBase} ${widgetButtonVariants[variant]} ${widgetButtonSizes[size]} ${className}`.trim()
    return (
      <button ref={ref} type={type} className={composed} {...rest}>
        {children}
      </button>
    )
  },
)

WidgetButton.displayName = 'WidgetButton'

export type WidgetSurfaceTone = 'default' | 'accent' | 'muted' | 'warning' | 'danger' | 'success'

export type WidgetSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: WidgetSurfaceTone
  padding?: 'none' | 'sm' | 'md'
  shadow?: boolean
  border?: boolean
}

const surfaceToneStyles: Record<WidgetSurfaceTone, string> = {
  default: 'bg-[var(--surface-2)] text-[var(--text)]',
  accent: 'bg-[rgba(90,164,255,.12)] text-[var(--text)]',
  muted: 'bg-[var(--surface)] text-[var(--text-muted)]',
  warning: 'bg-[rgba(255,204,102,.12)] text-[var(--warning)]',
  danger: 'bg-[rgba(255,107,107,.12)] text-[var(--danger)]',
  success: 'bg-[rgba(95,211,154,.12)] text-[var(--success)]',
}

const surfaceBorderStyles: Record<WidgetSurfaceTone, string> = {
  default: 'border-[var(--line)]',
  accent: 'border-[rgba(90,164,255,.28)]',
  muted: 'border-[var(--line)]',
  warning: 'border-[rgba(255,204,102,.35)]',
  danger: 'border-[rgba(255,107,107,.35)]',
  success: 'border-[rgba(95,211,154,.35)]',
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
        {icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(90,164,255,.12)] text-[var(--accent)]">
            {icon}
          </span>
        )}
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </div>
          {subtitle && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </div>
          )}
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
  const helperClass = helperTone === 'muted' ? 'text-xs' : 'text-xs'
  const helperColor = helperTone === 'muted' ? 'var(--text-muted)' : 'var(--text)'
  return (
    <WidgetSection className={className} padding="sm" tone={tone}>
      <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      {helper && (
        <div className={helperClass} style={{ color: helperColor }}>
          {helper}
        </div>
      )}
    </WidgetSection>
  )
}
