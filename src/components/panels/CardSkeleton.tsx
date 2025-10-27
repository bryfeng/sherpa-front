// TODO: Workstream 5 — Performance & Loading

import React from 'react'

import { Skeleton } from '../Skeleton'
import type { WidgetDensity } from '../../types/widgets'

export interface CardSkeletonProps {
  density?: WidgetDensity
}

export function CardSkeleton({ density = 'rail' }: CardSkeletonProps) {
  const minHeightClass = density === 'full' ? 'min-h-[240px]' : 'min-h-[180px]'

  return (
    <div className={`flex w-full flex-col gap-[var(--s1)] ${minHeightClass}`} data-density={density} aria-hidden="true">
      <Skeleton width="28%" height="1rem" radius="var(--r-sm)" />
      <div className="space-y-[var(--s-1)]">
        <Skeleton height="0.75rem" radius="var(--r-sm)" />
        <Skeleton width="85%" height="0.75rem" radius="var(--r-sm)" />
        <Skeleton width="60%" height="0.75rem" radius="var(--r-sm)" />
      </div>
      <div className="mt-auto flex gap-[var(--s-1)]">
        <Skeleton width="80px" height="1.5rem" radius="999px" />
        <Skeleton width="68px" height="1.5rem" radius="999px" />
      </div>
    </div>
  )
}

export default CardSkeleton
