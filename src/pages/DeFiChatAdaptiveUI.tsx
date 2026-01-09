import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import { DeFiChatShell } from '../components/shell/DeFiChatShell'
import { ArtifactPicker } from '../components/artifacts/ArtifactPicker'
import { initialShellUIState, shellUIReducer, type ShellUIState } from '../hooks/useShellUIReducer'
import { useDeFiChatController, type DeFiChatAdaptiveUIProps } from '../hooks/useDeFiChatController'
import { EntitlementsProvider } from '../hooks/useEntitlements'
import { loadPanelUIState, debouncedSavePanelUI } from '../utils/panelPrefs'
import { useArtifacts, useConversationSidebar, useSherpaStore } from '../store'

function initializeState(): ShellUIState {
  const savedPanelUI = loadPanelUIState()
  return { ...initialShellUIState, panelUI: savedPanelUI }
}

export default function DeFiChatAdaptiveUI(props: DeFiChatAdaptiveUIProps) {
  const [shellState, dispatch] = useReducer(shellUIReducer, undefined, initializeState)
  const [artifactPickerOpen, setArtifactPickerOpen] = useState(false)

  useEffect(() => {
    debouncedSavePanelUI(shellState.panelUI)
  }, [shellState.panelUI])

  const {
    headerProps,
    chatSurfaceProps,
    workspaceSurfaceProps,
    surface,
    modals,
  } = useDeFiChatController({ props, shellState, dispatch })

  // Artifact panel state from store
  const {
    artifactTabs,
    activeArtifactId,
    panelWidth,
    isVisible: artifactPanelVisible,
    setActiveArtifact,
    closeArtifactTab,
    setPanelWidth,
    toggleVisibility,
  } = useArtifacts()

  // Conversation sidebar state from store
  const {
    isVisible: sidebarVisible,
    toggleSidebar,
  } = useConversationSidebar()

  // Get addWidget and startNewChat from store
  const addWidget = useSherpaStore((s) => s.addWidget)
  const walletAddress = useSherpaStore((s) => s.wallet.address)
  const startNewChat = useSherpaStore((s) => s.startNewChat)

  // Compute artifact widgets from controller widgets filtered by artifact tabs
  const artifactWidgets = useMemo(() => {
    return workspaceSurfaceProps.widgets.filter((w) => artifactTabs.includes(w.id))
  }, [workspaceSurfaceProps.widgets, artifactTabs])

  // Pin handler that adds widget to artifacts
  const handlePinToArtifact = useCallback(() => {
    const widgets = workspaceSurfaceProps.widgets
    if (widgets.length > 0) {
      // Get the most recent non-seeded widget, or the first widget
      const latestWidget = widgets.find((w) => w.id !== 'token_price_chart') ?? widgets[0]
      addWidget(latestWidget)
    }
  }, [workspaceSurfaceProps.widgets, addWidget])

  // Enhanced chat surface props with artifact pinning
  const enhancedChatSurfaceProps = useMemo(() => ({
    ...chatSurfaceProps,
    onPinLatest: handlePinToArtifact,
  }), [chatSurfaceProps, handlePinToArtifact])

  const entitlementsValue = useMemo(
    () => ({ isPro: props.pro, requestProUpgrade: props.onRequestPro }),
    [props.pro, props.onRequestPro],
  )

  return (
    <EntitlementsProvider value={entitlementsValue}>
      <DeFiChatShell
        header={headerProps}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={toggleSidebar}
        walletAddress={walletAddress}
        onNewChat={startNewChat}
        artifactPanelVisible={artifactPanelVisible}
        onToggleArtifactPanel={toggleVisibility}
        artifactButtonLabel="Artifacts"
        artifactCount={artifactTabs.length}
        chat={enhancedChatSurfaceProps}
        artifacts={{
          artifactWidgets,
          activeArtifactId,
          panelWidth,
          walletAddress: walletAddress ?? undefined,
          onTabClick: setActiveArtifact,
          onTabClose: closeArtifactTab,
          onPanelResize: setPanelWidth,
          onAddArtifact: () => setArtifactPickerOpen(true),
        }}
      />
      {modals}
      <ArtifactPicker
        isOpen={artifactPickerOpen}
        onClose={() => setArtifactPickerOpen(false)}
        walletAddress={walletAddress ?? undefined}
      />
    </EntitlementsProvider>
  )
}
