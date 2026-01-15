Agentic Wallet Frontend
======================

React 18 + TypeScript + Vite. The UI consumes the FastAPI backend in `backend/app` and now follows the 10 workstreams from the front-end optimisation spec.

Getting Started
---------------

1. Copy `.env.example` → `.env` and configure:
   - `VITE_API_BASE_URL` (defaults to `http://localhost:8000`)
   - `VITE_WALLETCONNECT_PROJECT_ID` (from WalletConnect Cloud) to enable WalletConnect/AppKit flows
2. Install deps with `npm install` (or `yarn`/`pnpm`).
3. Run `npm run dev` and open the Vite URL.

Architecture Overview
---------------------

- **Shell split**: `src/pages/DeFiChatAdaptiveUI.tsx` wires `components/shell/DeFiChatShell.tsx`, passing surface props from `hooks/useDeFiChatController.tsx`.
- **Surfaces**: Chat and workspace experiences live in `components/surfaces/ChatSurface.tsx` and `components/surfaces/WorkspaceSurface.tsx` respectively.
- **Panels & widgets**: `components/panels` host widget containers. Widgets must implement the `types/widgets.ts` contract and render through `PanelHost` / `PanelCard`.
- **Design tokens**: Visual styling is centralised in `src/styles/tokens.css` plus component snippets (e.g. `styles/components/card.css`, `styles/components/skeleton.css`). UI primitives in `components/ui/primitives.tsx` consume these tokens.
- **Entitlements & analytics**: Pro gating uses `hooks/useEntitlements.tsx` and the `<Entitled>` wrapper. Local analytics emit via `utils/events.ts`.

Key Directories
---------------

- `components/header` – header chrome, persona selector, kebab action menu.
- `components/surfaces` – chat/workspace layouts.
- `components/panels` – panel host, cards, skeletons, expanded modal.
- `components/widgets` – widget renderers (trending, relay quote, charts, etc.).
- `components/ui` – shared buttons, badges, cards, textareas.
- `hooks` – controller logic (`useDeFiChatController`), shell reducer, entitlements.
- `styles` – token definitions and CSS snippets supporting the design system.
- `test` – Vitest + React Testing Library unit tests for key UI units.

Runtime Notes
-------------

- Backend endpoints used:
  - `POST /chat` – agent responses + panel payloads
  - `GET /tools/portfolio?address=…&chain=ethereum|solana`
  - `GET /healthz`
- Session storage: per-address conversation IDs live at `localStorage['sherpa.conversation_id:{addressLower}']`; guest chat uses `sherpa.conversation_id:guest`.
- Wallet behaviour:
  - With `VITE_WALLETCONNECT_PROJECT_ID`, Reown AppKit exposes Wagmi (EVM) + Solana adapters side by side.
  - Without it, a "Use Address" fallback allows manual portfolio previews by address.
- Exporting sessions: use the header kebab menu → **Download session JSON** to capture messages + widgets.

Testing & Tooling
-----------------

- Linting: `npm run lint`
- Type-checking: `npm run typecheck`
- Unit tests: `npm run test` (uses Vitest + RTL; see `src/test`).

Changelog (Workstream Outcomes)
-------------------------------

1. Shell split & reducer-driven UI state
2. Unified widget contract with responsive grid layout
3. Workspace discoverability nudges + coach marks
4. Accessibility refinements (tablist toggle, focus styles, reduced motion)
5. Lazy-loaded panels with Suspense skeletons
6. Centralised Pro gating via `useEntitlements` / `<Entitled>`
7. Local analytics event sink for panel interactions
8. Design tokens & refactored primitives
9. Shared skeleton/error views wired through panel host
10. Simplified header/footer with consolidated action menu and consistent chat CTAs
