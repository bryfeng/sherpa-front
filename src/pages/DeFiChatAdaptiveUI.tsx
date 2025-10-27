import React, { useMemo, useReducer } from 'react'

import { DeFiChatShell } from '../components/shell/DeFiChatShell'
import { initialShellUIState, shellUIReducer } from '../hooks/useShellUIReducer'
import { useDeFiChatController, type DeFiChatAdaptiveUIProps } from '../hooks/useDeFiChatController'
import { EntitlementsProvider } from '../hooks/useEntitlements'

export default function DeFiChatAdaptiveUI(props: DeFiChatAdaptiveUIProps) {
  const [shellState, dispatch] = useReducer(shellUIReducer, initialShellUIState)
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
        activeSurface={surface.active}
        onSelectSurface={surface.onSurfaceChange}
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
