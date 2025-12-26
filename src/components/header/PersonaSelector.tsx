/**
 * PERSONA SELECTOR
 *
 * Animated persona selection component with visual previews.
 * Each persona has a distinct color and style.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Smile,
  Code,
  Briefcase,
  GraduationCap,
  Check,
} from 'lucide-react'
import type { PersonaId } from '../../store'
import '../../styles/design-system.css'

// ============================================
// PERSONA CONFIGURATION
// ============================================

interface PersonaConfig {
  id: PersonaId
  name: string
  description: string
  color: string
  bgColor: string
  icon: React.ReactNode
  traits: string[]
}

const personas: PersonaConfig[] = [
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Casual, approachable explanations',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.12)',
    icon: <Smile className="w-4 h-4" />,
    traits: ['Warm', 'Encouraging', 'Simple'],
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Detailed, precise analysis',
    color: '#a78bfa',
    bgColor: 'rgba(167, 139, 250, 0.12)',
    icon: <Code className="w-4 h-4" />,
    traits: ['Precise', 'Data-driven', 'Thorough'],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal, executive summaries',
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.12)',
    icon: <Briefcase className="w-4 h-4" />,
    traits: ['Concise', 'Strategic', 'Formal'],
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Teaching mode with examples',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.12)',
    icon: <GraduationCap className="w-4 h-4" />,
    traits: ['Patient', 'Examples', 'Step-by-step'],
  },
]

// ============================================
// PERSONA OPTION
// ============================================

interface PersonaOptionProps {
  config: PersonaConfig
  isSelected: boolean
  onClick: () => void
}

function PersonaOption({ config, isSelected, onClick }: PersonaOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors"
      style={{
        background: isSelected ? config.bgColor : 'transparent',
        border: isSelected ? `1px solid ${config.color}30` : '1px solid transparent',
      }}
      whileHover={{ backgroundColor: config.bgColor }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: config.bgColor,
          color: config.color,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-sm"
            style={{ color: 'var(--text)' }}
          >
            {config.name}
          </span>
          {isSelected && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex-shrink-0"
              style={{ color: config.color }}
            >
              <Check className="w-3.5 h-3.5" />
            </motion.span>
          )}
        </div>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          {config.description}
        </p>
        <div className="flex gap-1.5 mt-2">
          {config.traits.map((trait) => (
            <span
              key={trait}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{
                background: config.bgColor,
                color: config.color,
              }}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  )
}

// ============================================
// PERSONA SELECTOR
// ============================================

export interface PersonaSelectorProps {
  value: PersonaId
  onChange: (persona: PersonaId) => void
  compact?: boolean
}

export function PersonaSelector({
  value,
  onChange,
  compact = false,
}: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = personas.find((p) => p.id === value) || personas[0]

  return (
    <div className="relative">
      {/* Trigger button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{
          background: selected.bgColor,
          border: '1px solid var(--line)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div style={{ color: selected.color }}>
          {selected.icon}
        </div>
        {!compact && (
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text)' }}
          >
            {selected.name}
          </span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full left-0 mt-2 w-72 z-50 rounded-xl overflow-hidden"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="p-2">
                <div
                  className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Select Persona
                </div>
                <div className="space-y-1">
                  {personas.map((persona) => (
                    <PersonaOption
                      key={persona.id}
                      config={persona}
                      isSelected={persona.id === value}
                      onClick={() => {
                        onChange(persona.id)
                        setIsOpen(false)
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Footer info */}
              <div
                className="px-4 py-3 border-t"
                style={{
                  borderColor: 'var(--line)',
                  background: 'var(--surface-2)',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Persona affects how Sherpa communicates. Your data and analysis remain the same.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PersonaSelector
