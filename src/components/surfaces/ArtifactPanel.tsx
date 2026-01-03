import React, { memo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Widget } from '../../types/widgets'
import { ResizablePanel } from '../ui/ResizablePanel'
import { ArtifactHeader } from '../artifacts/ArtifactHeader'
import { ArtifactTabs } from '../artifacts/ArtifactTabs'
import { ArtifactContent } from '../artifacts/ArtifactContent'

export interface ArtifactPanelProps {
  /** All widgets in the artifact tabs */
  artifactWidgets: Widget[]
  /** Currently active artifact ID */
  activeArtifactId: string | null
  /** Current panel width */
  panelWidth: number
  /** Whether the panel is visible */
  isVisible: boolean
  /** Connected wallet address */
  walletAddress?: string
  /** Callbacks */
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
  onCollapse: () => void
  onPanelResize: (width: number) => void
  onAddArtifact?: () => void
}

function ArtifactPanelComponent({
  artifactWidgets,
  activeArtifactId,
  panelWidth,
  isVisible,
  walletAddress,
  onTabClick,
  onTabClose,
  onCollapse,
  onPanelResize,
  onAddArtifact,
}: ArtifactPanelProps) {
  const activeArtifact = artifactWidgets.find((w) => w.id === activeArtifactId) ?? null

  // Keyboard shortcut: Escape to close panel
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        onCollapse()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onCollapse])

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-1 overflow-hidden border-l min-w-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <div
            className="flex h-full w-full flex-col"
            style={{
              background: 'var(--surface)',
            }}
          >
            <ArtifactHeader
              tabCount={artifactWidgets.length}
              onCollapse={onCollapse}
              onAddArtifact={onAddArtifact}
            />

            <ArtifactTabs
              tabs={artifactWidgets}
              activeId={activeArtifactId}
              onTabClick={onTabClick}
              onTabClose={onTabClose}
            />

            <ArtifactContent
              artifact={activeArtifact}
              walletAddress={walletAddress}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const ArtifactPanel = memo(ArtifactPanelComponent)
