# Sherpa Frontend Redesign

## Overview

This document outlines the comprehensive redesign of the Sherpa frontend, transforming it from a generic AI chat interface into a distinctive, premium DeFi portfolio analysis application.

## Design Philosophy: "Alpine Precision"

- **Clean lines with subtle depth** - Moving away from flat AI aesthetics
- **Warm neutrals with electric accents** - Amber primary, arctic blue secondary
- **Professional trading feel** - Precise data visualization with approachable AI assistant
- **Persona-aware theming** - Each AI persona has its own visual identity

---

## New Files Created

### 1. Design System (`src/styles/design-system.css`)

A comprehensive design token system featuring:

- **Custom Typography**: Outfit (display), DM Sans (body), JetBrains Mono (code)
- **Dark Theme "Midnight Alpine"**: Deep blues (#0a0c10 to #2d3444) with amber accent (#f5a623)
- **Light Theme "Alpine Summit"**: Crisp whites with warm amber accent
- **Persona Colors**:
  - Friendly: Emerald (#34d399)
  - Technical: Violet (#a78bfa)
  - Professional: Sky Blue (#60a5fa)
  - Educational: Amber (#fbbf24)
- **Refined Shadows**: Layered depth with glow effects
- **Animation Keyframes**: shimmer, slide-up, scale-in, fade-in
- **Utility Classes**: `.glass`, `.glow`, `.gradient-border`, `.text-gradient`

### 2. Zustand Store (`src/store/index.ts`)

Centralized state management replacing 11+ scattered useState calls:

```typescript
// Slices
- AppSlice: theme, persona, llmModel, healthStatus
- WalletSlice: wallet connection, entitlements, pro status
- ChatSlice: messages, conversation, typing state
- WorkspaceSlice: widgets, panels, portfolio
- UISlice: modals, announcements, coach marks

// Convenience hooks
useTheme(), usePersona(), useWallet(), useChat(), useWorkspace(), useModals()
```

### 3. Decomposed Hooks

#### `src/hooks/useChatEngine.ts`
Focused hook for chat conversations:
- Message management
- AI interaction
- Conversation persistence
- Input handling

#### `src/hooks/useMarketData.ts`
Market data fetching:
- Top coins loading
- Trending tokens (auto-refresh every 60s)
- Token price charts

### 4. Redesigned Components

#### `src/components/chat/ChatInterface.tsx`
Premium chat interface with:
- Persona-aware styling
- Animated typing indicator
- Rich markdown rendering
- Quick action pills
- Source badges

#### `src/components/panels/WidgetCard.tsx`
Enhanced widget cards:
- Smooth reveal animations
- Highlight state for new widgets
- Drag handle for reordering
- Collapsible content
- Loading skeleton

#### `src/components/header/PersonaSelector.tsx`
Animated persona dropdown:
- Visual previews for each persona
- Trait tags
- Smooth animations

#### `src/components/shell/AppShell.tsx`
Redesigned application shell:
- Premium header with logo
- Resizable chat/workspace layout
- Theme toggle with animation
- Wallet connection status

---

## Migration Guide

### Step 1: Install Dependencies

```bash
# The store uses zustand which is already installed
# Ensure you have framer-motion (already present)
npm install
```

### Step 2: Import Design System

Update `src/index.css` or `src/main.tsx`:

```css
@import './styles/design-system.css';
```

### Step 3: Migrate State

Replace scattered useState in App.tsx with Zustand store:

```tsx
// Before
const [persona, setPersona] = useState<PersonaId>('friendly')
const [theme, setTheme] = useState<'default' | 'snow'>('snow')
// ... 9 more useState calls

// After
import { useSherpaStore, useTheme, usePersona } from './store'

function App() {
  const { theme, toggleTheme } = useTheme()
  const { persona, setPersona } = usePersona()
  const wallet = useSherpaStore((s) => s.wallet)
  // ...
}
```

### Step 4: Replace useDeFiChatController

Instead of the 1200-line monolith:

```tsx
// Before
const controller = useDeFiChatController({ props, shellState, dispatch })

// After - use focused hooks
const chat = useChatEngine({
  walletAddress,
  llmModel,
  onNewWidgets: (widgets) => addWidget(widgets[0]),
  onPortfolioRequested: refreshPortfolio,
})

const market = useMarketData()
```

### Step 5: Use New Components

```tsx
import { AppShell } from './components/shell/AppShell'
import { ChatInterface } from './components/chat/ChatInterface'
import { WidgetCard } from './components/panels/WidgetCard'
import { PersonaSelector } from './components/header/PersonaSelector'
```

---

## Architecture Recommendations

### 1. Add React Router

Currently using `window.location.pathname` string matching. Add proper routing:

```bash
npm install react-router-dom
```

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/playground" element={<WidgetPlayground />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### 2. Add Error Boundaries

Wrap key sections with error boundaries:

```tsx
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary fallback={<ErrorView />}>
  <ChatInterface {...props} />
</ErrorBoundary>
```

### 3. Improve API Layer

Add request interceptors for auth and error handling:

```typescript
// src/services/api.ts
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error)
  }
)
```

### 4. Add Service Worker

For offline support and caching:

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sherpa AI',
        short_name: 'Sherpa',
        theme_color: '#f5a623',
      },
    }),
  ],
})
```

---

## Visual Comparison

### Before (Generic AI Chat)
- Flat colors with minimal depth
- Generic Inter/system fonts
- Blue-purple gradient accent
- Cookie-cutter component patterns

### After (Premium DeFi Interface)
- Layered depth with subtle shadows
- Distinctive Outfit + DM Sans typography
- Warm amber accent with arctic blue secondary
- Persona-aware theming
- Smooth micro-interactions
- Professional trading aesthetic

---

## File Structure (Proposed)

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx    # NEW
│   │   ├── MessageBubble.tsx
│   │   └── ChatInput.tsx
│   ├── header/
│   │   ├── PersonaSelector.tsx  # NEW
│   │   └── SettingsMenu.tsx
│   ├── panels/
│   │   ├── WidgetCard.tsx       # NEW
│   │   ├── PanelHost.tsx
│   │   └── ...
│   ├── shell/
│   │   ├── AppShell.tsx         # NEW
│   │   └── DeFiChatShell.tsx
│   └── ui/
│       └── primitives.tsx
├── hooks/
│   ├── useChatEngine.ts         # NEW
│   ├── useMarketData.ts         # NEW
│   └── ...
├── store/
│   └── index.ts                 # NEW - Zustand store
├── styles/
│   ├── design-system.css        # NEW
│   └── tokens.css
└── ...
```

---

## Next Steps

1. **Integrate new design system** - Import design-system.css globally
2. **Migrate to Zustand store** - Replace App.tsx useState calls
3. **Replace chat components** - Use new ChatInterface
4. **Add routing** - Install react-router-dom
5. **Testing** - Update tests for new components
6. **Performance** - Add React.lazy for route-based code splitting

---

## Performance Optimizations

1. **Memoization**: All new components use `React.memo`
2. **Virtualization**: Consider `react-virtual` for long message lists
3. **Code splitting**: Use dynamic imports for modals
4. **Image optimization**: Use WebP with fallbacks

---

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Reduced motion support (`prefers-reduced-motion`)
- Screen reader announcements for new messages
- Focus management in modals

---

Created by the frontend-design skill for Sherpa DeFi Portfolio Assistant.
