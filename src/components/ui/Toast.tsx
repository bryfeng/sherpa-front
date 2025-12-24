import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
  visible: boolean
}

const icons = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: {
    bg: 'rgba(95, 211, 154, 0.15)',
    border: 'rgba(95, 211, 154, 0.3)',
    text: 'var(--success)',
  },
  error: {
    bg: 'rgba(255, 107, 107, 0.15)',
    border: 'rgba(255, 107, 107, 0.3)',
    text: 'var(--danger)',
  },
  info: {
    bg: 'rgba(90, 164, 255, 0.15)',
    border: 'rgba(90, 164, 255, 0.3)',
    text: 'var(--accent)',
  },
}

export function Toast({ message, type = 'success', duration = 2500, onClose, visible }: ToastProps) {
  const Icon = icons[type]
  const color = colors[type]

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg"
            style={{
              background: color.bg,
              border: `1px solid ${color.border}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Icon className="h-5 w-5 shrink-0" style={{ color: color.text }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {message}
            </span>
            <button
              onClick={onClose}
              className="ml-2 rounded-full p-1 transition-colors hover:bg-[var(--hover)]"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true })
  }

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }))
  }

  const ToastComponent = (
    <Toast
      message={toast.message}
      type={toast.type}
      visible={toast.visible}
      onClose={hideToast}
    />
  )

  return { showToast, hideToast, ToastComponent }
}
