/**
 * INLINE CARD COMPONENT
 *
 * Minimal card wrapper for inline components in chat.
 * No drag handles, no collapse buttons - just clean presentation.
 */

import React from 'react'
import { motion } from 'framer-motion'
import type { InlineComponentVariant } from '../../types/defi-ui'
import '../../styles/inline-components.css'

interface InlineCardProps {
  children: React.ReactNode
  variant?: InlineComponentVariant
  title?: string
  className?: string
}

const variantMaxWidths: Record<InlineComponentVariant, string> = {
  compact: '400px',
  standard: '100%',  // Full width within message area
  expanded: '100%',
}

export function InlineCard({
  children,
  variant = 'standard',
  title,
  className = '',
}: InlineCardProps) {
  return (
    <motion.div
      className={`inline-component inline-component--${variant} ${className}`}
      style={{ maxWidth: variantMaxWidths[variant] }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {title && (
        <div className="inline-component__header">
          <span className="inline-component__title">{title}</span>
        </div>
      )}
      <div className="inline-component__content">
        {children}
      </div>
    </motion.div>
  )
}

export default InlineCard
