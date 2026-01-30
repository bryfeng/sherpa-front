import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import { DeFiChatShell } from '../components/shell/DeFiChatShell'
import { WidgetPicker } from '../components/widgets/panel/WidgetPicker'
import { initialShellUIState, shellUIReducer, type ShellUIState } from '../hooks/useShellUIReducer'
import { useDeFiChatController, type DeFiChatAdaptiveUIProps } from '../hooks/useDeFiChatController'
import { EntitlementsProvider } from '../hooks/useEntitlements'
import { loadPanelUIState, debouncedSavePanelUI } from '../utils/panelPrefs'
import { useWidgetPanel, useConversationSidebar, useSherpaStore } from '../store'

function initializeState(): ShellUIState {
  const savedPanelUI = loadPanelUIState()
  return { ...initialShellUIState, panelUI: savedPanelUI }
}

export default function DeFiChatAdaptiveUI(props: DeFiChatAdaptiveUIProps) {
  const [shellState, dispatch] = useReducer(shellUIReducer, undefined, initializeState)
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false)

  useEffect(() => {
    debouncedSavePanelUI(shellState.panelUI)
  }, [shellState.panelUI])

  const {
    headerProps,
    chatSurfaceProps,
    workspaceSurfaceProps,
    surface: _surface,
    modals,
  } = useDeFiChatController({ props, shellState, dispatch })

  // Widget panel state from store
  const {
    widgetTabs,
    activeWidgetId,
    panelWidth,
    isVisible: widgetPanelVisible,
    setActiveWidget,
    closeWidgetTab,
    setPanelWidth,
    toggleVisibility,
  } = useWidgetPanel()

  // Conversation sidebar state from store
  const {
    isVisible: sidebarVisible,
    toggleSidebar,
  } = useConversationSidebar()

  // Get addWidget and startNewChat from store
  const addWidget = useSherpaStore((s) => s.addWidget)
  const walletAddress = useSherpaStore((s) => s.wallet.address)
  const startNewChat = useSherpaStore((s) => s.startNewChat)

  // Compute panel widgets from controller widgets filtered by widget tabs
  const panelWidgets = useMemo(() => {
    return workspaceSurfaceProps.widgets.filter((w) => widgetTabs.includes(w.id))
  }, [workspaceSurfaceProps.widgets, widgetTabs])

  // Pin handler that adds widget to panel
  const handlePinToPanel = useCallback(() => {
    const widgets = workspaceSurfaceProps.widgets
    if (widgets.length > 0) {
      // Get the most recent non-seeded widget, or the first widget
      const latestWidget = widgets.find((w) => w.id !== 'token_price_chart') ?? widgets[0]
      addWidget(latestWidget)
    }
  }, [workspaceSurfaceProps.widgets, addWidget])

  // Enhanced chat surface props with widget pinning
  const enhancedChatSurfaceProps = useMemo(() => ({
    ...chatSurfaceProps,
    onPinLatest: handlePinToPanel,
  }), [chatSurfaceProps, handlePinToPanel])

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
        widgetPanelVisible={widgetPanelVisible}
        onToggleWidgetPanel={toggleVisibility}
        widgetButtonLabel="Widgets"
        widgetCount={widgetTabs.length}
        chat={enhancedChatSurfaceProps}
        widgetPanel={{
          panelWidgets,
          activeWidgetId,
          panelWidth,
          walletAddress: walletAddress ?? undefined,
          walletReady: workspaceSurfaceProps.walletReady,
          onTabClick: setActiveWidget,
          onTabClose: closeWidgetTab,
          onPanelResize: setPanelWidth,
          onAddWidget: () => setWidgetPickerOpen(true),
          onSwap: workspaceSurfaceProps.onSwap,
          onBridge: workspaceSurfaceProps.onBridge,
          onRefreshSwapQuote: workspaceSurfaceProps.onRefreshSwapQuote,
          onRefreshBridgeQuote: workspaceSurfaceProps.onRefreshBridgeQuote,
          onInsertQuickPrompt: workspaceSurfaceProps.onInsertQuickPrompt,
          onExpandWidget: workspaceSurfaceProps.onExpand,
        }}
      />
      {modals}
      <WidgetPicker
        isOpen={widgetPickerOpen}
        onClose={() => setWidgetPickerOpen(false)}
        walletAddress={walletAddress ?? undefined}
      />
    </EntitlementsProvider>
  )
}
