import React, { useEffect, useMemo, useReducer } from 'react'

import { DeFiChatShell } from '../components/shell/DeFiChatShell'
import { initialShellUIState, shellUIReducer, type ShellUIState } from '../hooks/useShellUIReducer'
import { useDeFiChatController, type DeFiChatAdaptiveUIProps } from '../hooks/useDeFiChatController'
import { EntitlementsProvider } from '../hooks/useEntitlements'
import { loadPanelUIState, debouncedSavePanelUI } from '../utils/panelPrefs'

function initializeState(): ShellUIState {
  const savedPanelUI = loadPanelUIState()
  return { ...initialShellUIState, panelUI: savedPanelUI }
}

export default function DeFiChatAdaptiveUI(props: DeFiChatAdaptiveUIProps) {
  const [shellState, dispatch] = useReducer(shellUIReducer, undefined, initializeState)

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

  const entitlementsValue = useMemo(
    () => ({ isPro: props.pro, requestProUpgrade: props.onRequestPro }),
    [props.pro, props.onRequestPro],
  )

  return (
    <EntitlementsProvider value={entitlementsValue}>
      <DeFiChatShell
        header={headerProps}
        workspaceVisible={surface.workspaceVisible}
        onToggleWorkspace={surface.onToggleWorkspace}
        workspaceButtonLabel={surface.workspaceLabel}
        conversationDisplay={surface.conversationLabel}
        railChip={surface.portfolioChip}
        chat={chatSurfaceProps}
        workspace={workspaceSurfaceProps}
      />
      {modals}
    </EntitlementsProvider>
  )
}
