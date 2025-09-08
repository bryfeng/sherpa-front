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
  - `GET /tools/portfolio?address=...&chain=ethereum` for portfolio
  - `GET /healthz` for health status
- CORS is enabled in the backend (`app.main`).

Wallets

- When `VITE_WALLETCONNECT_PROJECT_ID` is set, the app shows a WalletConnect modal with multiple EVM wallets.
- If not set, a fallback "Use Address" button lets you paste an `0x...` address to preview portfolio data.
- Architecture is ready to add non‑EVM connectors (e.g., Solana, Sui) via separate providers later.

Roadmap

- Phase 1: Core chat + persona switching (done - minimal)
- Phase 2: Panels from `ChatResponse.panels` (portfolio, etc.)
- Phase 3: Style commands and command palette
- Phase 4: Performance and advanced features
