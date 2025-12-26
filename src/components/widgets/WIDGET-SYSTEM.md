# Sherpa Widget System

A comprehensive, user-centric widget system designed for DeFi portfolio workspaces.

## Design Philosophy

The widget system is built around these core principles:

1. **User-First Design**: Every widget interaction is designed with the user's workflow in mind
2. **Flexible Layout**: Widgets can be sized, positioned, and organized to fit any workflow
3. **Smart Data Management**: Auto-refresh, staleness detection, and efficient updates
4. **Category Organization**: Widgets are grouped by purpose for easy discovery
5. **Accessibility**: Full keyboard navigation, ARIA labels, and reduced motion support

---

## Architecture Overview

```
src/
├── types/
│   └── widget-system.ts      # Type definitions
├── lib/
│   └── widget-registry.ts    # Widget metadata & factory
├── store/
│   └── widget-store.ts       # Zustand state management
└── components/widgets/
    ├── WidgetBase.tsx        # Base wrapper component
    ├── WidgetGrid.tsx        # Grid layout with DnD
    ├── WidgetPicker.tsx      # Add widget modal
    └── index.ts              # Public exports
```

---

## Widget Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Data** | Display portfolio and token info | Portfolio Summary, Token Balances, Price Ticker |
| **Chart** | Visualizations and graphs | Price Chart, Allocation Pie, P&L Chart |
| **Action** | Execute transactions | Swap, Bridge, Send, Stake |
| **Insight** | AI analysis and predictions | AI Summary, Market Prediction, Risk Analysis |
| **History** | Activity logs | Transactions, Chat History, Activity Log |
| **Utility** | Tools and helpers | Gas Tracker, Calculator, Notes |

---

## Widget Sizing

Widgets use a 12-column grid system with configurable row height:

```typescript
type WidgetSize = {
  cols: 1 | 2 | 3 | 4 | 6 | 12  // Column span
  rows: 1 | 2 | 3 | 4           // Row span
}

// Preset sizes for common use cases
const SIZE_PRESETS = {
  compact:  { cols: 3,  rows: 1 },  // Small data displays
  standard: { cols: 4,  rows: 2 },  // Most widgets
  wide:     { cols: 6,  rows: 2 },  // Charts with context
  tall:     { cols: 4,  rows: 3 },  // Detailed lists
  large:    { cols: 6,  rows: 3 },  // Full charts
  full:     { cols: 12, rows: 2 },  // Full-width panels
}
```

---

## Widget States

### Lifecycle States

```typescript
type WidgetLifecycleState =
  | 'loading'    // Initial data fetch
  | 'ready'      // Loaded and displaying data
  | 'refreshing' // Updating in background
  | 'stale'      // Data is outdated
  | 'error'      // Failed to load/update
```

### Display States

```typescript
interface WidgetDisplayState {
  collapsed: boolean   // Header only
  pinned: boolean      // Stays at top
  highlighted: boolean // New/updated indicator
  dragging: boolean    // Being moved
  editing: boolean     // In edit mode
}
```

---

## Usage Examples

### Adding a Widget

```typescript
import { useWidgetStore } from './store/widget-store'

function MyComponent() {
  const addWidget = useWidgetStore((s) => s.addWidget)

  const handleAdd = () => {
    addWidget({
      kind: 'price-chart',
      title: 'ETH Price',
      payload: {
        symbol: 'ETH',
        timeframe: '24H',
      },
    })
  }

  return <button onClick={handleAdd}>Add Chart</button>
}
```

### Rendering Widgets

```typescript
import { WidgetGrid, WidgetBase, useWidgets } from './components/widgets'

function Workspace() {
  return (
    <WidgetGrid
      renderWidget={(widget) => (
        <WidgetBase widget={widget}>
          {/* Render widget content based on kind */}
          {widget.kind === 'price-chart' && <PriceChart data={widget.payload} />}
          {widget.kind === 'portfolio-summary' && <PortfolioSummary data={widget.payload} />}
          {/* ... other widget kinds */}
        </WidgetBase>
      )}
    />
  )
}
```

### Custom Widget with Refresh

```typescript
import { WidgetBase } from './components/widgets'

function MyWidget({ widget }) {
  const [data, setData] = useState(null)
  const setWidgetState = useWidgetStore((s) => s.setWidgetState)
  const markRefreshed = useWidgetStore((s) => s.markWidgetRefreshed)

  const handleRefresh = async () => {
    try {
      const newData = await fetchData()
      setData(newData)
      markRefreshed(widget.id)
    } catch (err) {
      setWidgetState(widget.id, 'error', err.message)
    }
  }

  return (
    <WidgetBase widget={widget} onRefresh={handleRefresh}>
      <div>{/* widget content */}</div>
    </WidgetBase>
  )
}
```

---

## Widget Registry

Each widget kind has associated metadata:

```typescript
interface WidgetMetadata {
  kind: WidgetKind
  category: WidgetCategory
  name: string
  description: string
  icon: string
  defaultSize: WidgetSizePreset
  minSize: WidgetSize
  maxSize: WidgetSize
  resizable: boolean
  refreshable: boolean
  defaultRefreshInterval: number  // seconds
  requiresWallet: boolean
  requiresPro: boolean
  tags: string[]
}
```

### Using the Registry

```typescript
import { getWidgetMetadata, searchWidgets, getWidgetsByCategory } from './lib/widget-registry'

// Get metadata for a widget kind
const chartMeta = getWidgetMetadata('price-chart')
console.log(chartMeta.defaultRefreshInterval) // 30

// Search widgets by text
const results = searchWidgets('price')  // Returns matching widgets

// Get all widgets in a category
const dataWidgets = getWidgetsByCategory('data')
```

---

## Workspace Presets

Pre-configured widget layouts for common use cases:

```typescript
const WORKSPACE_PRESETS = [
  {
    id: 'day-trader',
    name: 'Day Trader',
    description: 'Real-time prices, charts, and quick swap access',
    widgets: [...]
  },
  {
    id: 'portfolio-manager',
    name: 'Portfolio Manager',
    description: 'Track holdings, allocation, and performance',
    widgets: [...]
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'AI insights, news, and market analysis',
    widgets: [...]
  }
]
```

### Applying a Preset

```typescript
const applyPreset = useWidgetStore((s) => s.applyPreset)
applyPreset('day-trader')  // Clears workspace and adds preset widgets
```

---

## Widget Linking

Widgets can be linked for cross-widget interaction:

```typescript
const linkWidgets = useWidgetStore((s) => s.linkWidgets)

// When selecting a token in portfolio, update the price chart
linkWidgets(portfolioWidgetId, priceChartWidgetId, 'token')
```

Link types:
- `token` - Token selection syncs between widgets
- `timeframe` - Timeframe selection syncs (1H, 24H, 7D, etc.)
- `chain` - Chain selection syncs
- `address` - Address focus syncs

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Refresh focused widget |
| `P` | Pin/unpin focused widget |
| `D` | Duplicate focused widget |
| `S` | Open widget settings |
| `Delete` | Remove focused widget |
| `Escape` | Close picker/modal |
| `Tab` | Navigate between widgets |

---

## Auto-Refresh System

Widgets with `refreshable: true` support automatic data refresh:

```typescript
interface WidgetRefreshConfig {
  enabled: boolean
  intervalSeconds: number        // 0 = manual only
  staleThresholdSeconds: number  // When to show "stale" indicator
  lastRefreshedAt: number | null
}
```

### Checking Refresh Status

```typescript
import { isWidgetStale, needsAutoRefresh } from './lib/widget-registry'

if (needsAutoRefresh(widget)) {
  // Trigger refresh
}

if (isWidgetStale(widget)) {
  // Show stale indicator
}
```

---

## Styling

Widgets use the design system CSS variables:

```css
.widget-base {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
}

/* Category colors */
[data-category="data"]    { --widget-accent: #60a5fa; }
[data-category="chart"]   { --widget-accent: #34d399; }
[data-category="action"]  { --widget-accent: #f59e0b; }
[data-category="insight"] { --widget-accent: #a78bfa; }
[data-category="history"] { --widget-accent: #6b7280; }
[data-category="utility"] { --widget-accent: #ec4899; }
```

---

## Migration from Legacy Panels

The new widget system replaces the old panel system. Key changes:

| Old (Panels) | New (Widgets) |
|--------------|---------------|
| `Panel` type | `Widget` type |
| `PanelHost` | `WidgetGrid` |
| `PanelCard` | `WidgetBase` |
| `useDeFiChatController` panels | `useWidgetStore` |
| `density: 'rail' | 'full'` | `size: { cols, rows }` |

### Migration Steps

1. Update imports from `./panels` to `./components/widgets`
2. Replace `Panel` types with `Widget` types
3. Use `useWidgetStore` for state management
4. Update panel rendering to use `WidgetBase` wrapper
5. Convert density to explicit size configuration

---

## Best Practices

1. **Always provide loading states** - Users should know when data is being fetched
2. **Handle errors gracefully** - Show retry buttons and helpful messages
3. **Use appropriate sizes** - Don't make widgets larger than needed
4. **Set realistic refresh intervals** - Balance freshness with performance
5. **Mark pro features clearly** - Users should know what requires subscription
6. **Support keyboard navigation** - Ensure all actions are keyboard accessible
7. **Persist user preferences** - Remember size, position, and collapsed state

---

## Future Enhancements

- [ ] Resize handles on widgets
- [ ] Snap-to-grid while dragging
- [ ] Widget templates (user-created presets)
- [ ] Export/import workspace configurations
- [ ] Mobile-optimized layout switching
- [ ] Widget recommendations based on usage
