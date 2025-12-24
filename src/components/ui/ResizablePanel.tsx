import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
  className?: string
  onResize?: (width: number) => void
}

export function ResizablePanel({
  children,
  defaultWidth = 380,
  minWidth = 280,
  maxWidth = 600,
  side = 'left',
  className = '',
  onResize,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }, [width])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return

    const delta = side === 'left'
      ? e.clientX - startXRef.current
      : startXRef.current - e.clientX

    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta))
    setWidth(newWidth)
    onResize?.(newWidth)
  }, [isResizing, side, minWidth, maxWidth, onResize])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={{ width }}
    >
      {children}
      <div
        className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} h-full w-1 cursor-col-resize group`}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setWidth((w) => Math.max(minWidth, w - 20))
          } else if (e.key === 'ArrowRight') {
            setWidth((w) => Math.min(maxWidth, w + 20))
          }
        }}
      >
        <div
          className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} h-full w-1 transition-colors ${
            isResizing ? 'bg-[var(--accent)]' : 'bg-transparent hover:bg-[var(--accent)]/50'
          }`}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'} flex h-8 w-3 items-center justify-center rounded-full transition-opacity ${
            isResizing ? 'opacity-100 bg-[var(--accent)]' : 'opacity-0 group-hover:opacity-100 bg-[var(--surface-2)]'
          }`}
          style={{ border: '1px solid var(--line)' }}
        >
          <div className="flex flex-col gap-0.5">
            <div className="h-0.5 w-0.5 rounded-full bg-[var(--text-muted)]" />
            <div className="h-0.5 w-0.5 rounded-full bg-[var(--text-muted)]" />
            <div className="h-0.5 w-0.5 rounded-full bg-[var(--text-muted)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
