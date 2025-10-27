// TODO: Workstream 9 — Empty & Error States

import React from 'react'

export interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
  radius?: number | string
}

export function Skeleton({ className = '', style, width = '100%', height = '1rem', radius = 'var(--r-md)' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: 'rgba(255,255,255,0.08)',
        ...style,
      }}
      aria-hidden="true"
    />
  )
}

export default Skeleton
