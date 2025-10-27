/* eslint-disable react/prop-types */
import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { children, className = '', variant = 'default', size = 'md', type = 'button', ...rest } = props
  const sizeClass = size === 'sm' ? 'btn-sm' : 'btn-md'
  const variantClass = variant === 'default' ? 'btn-primary' : 'btn-secondary'
  return (
    <button
      ref={ref}
      type={type}
      className={`btn ${sizeClass} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export function Card(
  { children, className = '', ...rest }:
  React.PropsWithChildren<{ className?: string } & React.HTMLAttributes<HTMLDivElement>>,
) {
  return (
    <div {...rest} className={`card ${className}`.trim()}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`flex items-center justify-between gap-[var(--s2)] border-b px-[var(--s3)] py-[var(--s2)] ${className}`.trim()} style={{ borderColor: 'var(--line)' }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`font-semibold text-[var(--fs-md)] ${className}`.trim()}>{children}</div>
}

export function CardContent({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-[var(--s3)] py-[var(--s2)] ${className}`.trim()}>{children}</div>
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(function Textarea(props, ref) {
  const { className = '', ...rest } = props
  return (
    <textarea
      {...rest}
      ref={ref}
      className={`input min-h-[56px] w-full flex-1 text-[var(--fs-sm)] outline-none ${className}`.trim()}
    />
  )
})

Textarea.displayName = 'Textarea'

export function Badge(
  { children, className = '', variant = 'outline', style }:
  React.PropsWithChildren<{ className?: string; variant?: 'solid' | 'outline' | 'secondary'; style?: React.CSSProperties }>,
) {
  return (
    <span
      className={`badge ${
        variant === 'solid' ? 'badge--solid' : variant === 'secondary' ? 'badge--secondary' : 'badge--outline'
      } ${className}`.trim()}
      style={style}
    >
      {children}
    </span>
  )
}
