Agentic Wallet Frontend

Tech stack: React 18 + TypeScript + Vite + Tailwind. Calls the existing FastAPI backend in `sherpa/app`.

Setup

- Copy `.env.example` to `.env` and set:
  - `VITE_API_BASE_URL` (default `http://localhost:8000`)
  - `VITE_WALLETCONNECT_PROJECT_ID` (from WalletConnect Cloud) to enable WalletConnect modal
- Install deps: `npm install` (or `pnpm install`/`yarn`).
- Run dev: `npm run dev` and open the shown URL.

Notes

- Backend endpoints used:
  - `POST /chat` for messages
  - `GET /tools/portfolio?address=...&chain=ethereum|solana` for portfolio snapshots
  - `GET /healthz` for health status
- CORS is enabled in the backend (`app.main`).

Conversation IDs

- The app persists chat sessions per wallet address.
- localStorage key: `sherpa.conversation_id:{address.toLowerCase()}`. Guests use `sherpa.conversation_id:guest`.
- On wallet connect/switch, the stored ID for that address is loaded; `/chat` responses always echo `conversation_id` which is saved back under the address key.

Wallets

- When `VITE_WALLETCONNECT_PROJECT_ID` is set, the app now exposes Reown AppKit with both Wagmi (EVM) and Solana adapters. WalletConnect sessions can connect Ethereum or Solana wallets side by side.
- If not set, a fallback "Use Address" button lets you paste either an `0x...` EVM address or a Solana base58 address to preview portfolio data.

Roadmap

- Phase 1: Core chat + persona switching (done - minimal)
- Phase 2: Panels from `ChatResponse.panels` (portfolio, etc.)
- Phase 3: Style commands and command palette
- Phase 4: Performance and advanced features
