/* eslint-disable react/prop-types */
import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { children, className = '', variant = 'default', size = 'md', type = 'button', style, ...rest } = props
  const baseClass = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150 focus-visible:outline-none'

  const sizeClasses: Record<string, string> = {
    sm: 'text-[var(--fs-xs)] min-h-[34px] px-[var(--s1)] py-[var(--s-1)] gap-[var(--s-1)]',
    md: 'text-[var(--fs-sm)] min-h-[40px] px-[var(--s2)] py-[var(--s1)] gap-[var(--s1)]',
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'var(--brand)',
      border: '1px solid var(--brand)',
      color: 'var(--bg)',
      boxShadow: 'var(--shadow-1)',
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid var(--line)',
      color: 'var(--text)',
    },
    secondary: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: 'var(--muted)',
      boxShadow: 'var(--shadow-1)',
    },
  }

  const mergedStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...style,
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseClass} ${sizeClasses[size] ?? sizeClasses.md} ${className}`}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export function Card(
  { children, className = '', style, ...rest }:
  React.PropsWithChildren<{ className?: string; style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>>,
) {
  const mergedStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-xl)',
    boxShadow: 'var(--shadow-2)',
    color: 'var(--text)',
    ...style,
  }

  return (
    <div {...rest} className={`card ${className}`} style={mergedStyle}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <div
      className={`flex items-center justify-between gap-[var(--s2)] border-b px-[var(--s3)] py-[var(--s2)] ${className}`}
      style={{ borderColor: 'var(--line)', ...style }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <div className={`font-semibold text-[var(--fs-md)] ${className}`} style={{ color: 'var(--text)', ...style }}>
      {children}
    </div>
  )
}

export function CardContent({ children, className = '', style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <div className={`px-[var(--s3)] py-[var(--s2)] ${className}`} style={style}>
      {children}
    </div>
  )
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(function Textarea(props, ref) {
  const { className = '', style, ...rest } = props
  const mergedStyle: React.CSSProperties = {
    background: 'var(--bg-elev)',
    border: '1px solid var(--line)',
    color: 'var(--text)',
    boxShadow: 'var(--shadow-1)',
    ...style,
  }
  return (
    <textarea
      {...rest}
      ref={ref}
      className={`min-h-[56px] w-full flex-1 rounded-2xl px-[var(--s2)] py-[var(--s1)] text-[var(--fs-sm)] placeholder:opacity-70 outline-none ${className}`}
      style={mergedStyle}
    />
  )
})

Textarea.displayName = 'Textarea'

export function Badge(
  { children, className = '', variant = 'solid', style }:
  React.PropsWithChildren<{ className?: string; variant?: 'solid' | 'outline' | 'secondary'; style?: React.CSSProperties }>,
) {
  const variantStyles: Record<string, React.CSSProperties> = {
    solid: {
      backgroundColor: 'var(--accent)',
      border: '1px solid rgba(255,255,255,0.16)',
      color: 'var(--bg)',
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid var(--line)',
      color: 'var(--text)',
    },
    secondary: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: 'var(--muted)',
    },
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-[var(--s1)] py-[2px] text-[var(--fs-xs)] ${className}`}
      style={{ ...variantStyles[variant], ...style }}
    >
      {children}
    </span>
  )
}
