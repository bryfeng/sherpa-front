import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'

interface SortablePanelItemProps {
  id: string
  children: React.ReactNode
}

const panelSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

const panelVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: panelSpring,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

export function SortablePanelItem({ id, children }: SortablePanelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={panelSpring}
      className={isDragging ? 'opacity-90 shadow-2xl' : ''}
    >
      <div className="relative">
        <button
          type="button"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 flex h-8 w-6 items-center justify-center rounded-md bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--hover)] hover:text-[var(--text)] transition-opacity cursor-grab active:cursor-grabbing focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="group">
          {children}
        </div>
      </div>
    </motion.div>
  )
}
