# Sherpa Widget Kit

A lightweight component library that keeps Sherpa's dashboards and chat widgets visually consistent. The kit lives at `src/components/widgets/widget-kit.tsx` and is intentionally tiny—just enough structure to compose cards, stat blocks, and call-to-action buttons without pulling in a broader design system.

## Quick Start

```tsx
import {
  WidgetCard,
  WidgetHeader,
  WidgetSection,
  WidgetButton,
  WidgetStat,
  WidgetStatGrid,
} from '../components/widgets/widget-kit'
```

1. **Wrap your widget:** use `WidgetCard` for the outer container (adds rounded corners, border, and subtle shadow).
2. **Add a header:** drop in `WidgetHeader` to expose a title/subtitle plus optional action buttons.
3. **Compose sections:** use `WidgetSection` (or stat helpers) to lay out the body.
4. **Wire actions:** use `WidgetButton` variants for primary/secondary/ghost CTAs that match the rest of the dashboard.

## Components at a Glance

| Component | Purpose | Notable Props |
| --------- | ------- | ------------- |
| `WidgetCard` | Elevated card shell | Accepts every `WidgetSurface` prop (`tone`, `padding`, `shadow`, `className`). Defaults to white surface with border + shadow. |
| `WidgetSection` | Lower-emphasis surface block (used for hotspots, lists, alerts) | `tone` (`default`, `accent`, `muted`, `warning`, `danger`), `padding` (`none`, `sm`, `md`), `border`, `shadow`. |
| `WidgetHeader` | Title area with optional icon and trailing actions | `title`, `subtitle`, `icon`, `actions` (React nodes). |
| `WidgetButton` | CTA button with Sherpa styling | `variant` (`primary`, `secondary`, `ghost`), `size` (`sm`, `md`), any native button prop. |
| `WidgetStatGrid` | Responsive grid for stats (1–4 columns) | `columns` (defaults to 2). |
| `WidgetStat` | Drop-in stat card with label/value/helper text | `label`, `value`, `helper`, `helperTone`, `tone`, `className`. |

> Under the hood, these components share `WidgetSurface`, which handles rounded corners, border palette, padding, and subtle shadows. Reach for it directly when you need custom layouts.

## Color Tones

Use `tone` to align with established color semantics:

- `default`: white background with slate border—neutral surfaces.
- `accent`: primary tint with contrasting text—great for call-outs.
- `muted`: light slate background—low emphasis blocks.
- `warning`: amber surface for actionable caveats or notices.
- `danger`: rose surface for errors or expired content.

## Building a Widget Step-by-Step

```tsx
function ExampleWidget() {
  // Fetch or derive your data here
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <WidgetCard>
      <WidgetHeader
        title="Relay Status"
        subtitle="Latest bridge signal from Sherpa"
        actions={
          <WidgetButton
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh status"
          >
            <Repeat className="h-4 w-4" />
          </WidgetButton>
        }
      />

      <WidgetStatGrid columns={2}>
        <WidgetStat label="Throughput" value="132 tx/min" helper="Across 8 chains" />
        <WidgetStat label="Latency" value="24s" helper="Median execution" />
      </WidgetStatGrid>

      <WidgetSection className="mt-3 space-y-2">
        <div className="text-sm font-semibold text-slate-900">Next steps</div>
        <p className="text-xs text-slate-600">
          Ask Sherpa for a fresh bridge quote if the network delay stays above target.
        </p>
        <WidgetButton variant="secondary" size="sm">
          Request quote
        </WidgetButton>
      </WidgetSection>
    </WidgetCard>
  )
}
```

### Tips

- **Keep headers light.** `WidgetHeader` expects a concise title and optional helper text. Reserve extra copy for the body.
- **Stack sections intentionally.** Use `className` on `WidgetSection`/`WidgetStat` to control spacing (`mt-3`, `space-y-2`, etc.).
- **Reuse prompts/actions.** The kit plays nicely with chat helpers—pipe callbacks into `WidgetButton` to insert prompts, trigger quotes, or open modals.

## Real Usage Examples

- `TrendingTokensWidget` reorganized its hotspots, token list, and refresh action with the kit (`src/components/widgets/TrendingTokensWidget.tsx`).
- `RelayQuoteWidget` now draws from dedicated swap/bridge themes (`src/components/widgets/relay-quote-theme.ts`) to render gradient quotes with frosted stats, prompts, and execution controls (`src/components/widgets/RelayQuoteWidget.tsx`).

## Extending the Kit

If you need a layout primitive the kit doesn't expose:

1. Prefer wrapping `WidgetSurface` (imported from the same file) to keep rounded corners, tone-aware borders, and padding consistent.
2. Add new tokens (e.g., `tone="success"`) sparingly—align with the existing color system before expanding.
3. Keep components presentational. Fetch data or handle business logic in the calling widget, not inside kit primitives.

## Static Playground

A dedicated playground now ships with the app. Start Vite (`npm run dev`) and open [`/widget-playground`](http://localhost:5173/widget-playground) to:

- See example compositions for cards, stat grids, and tone variants.
- Experiment with the **Gradient Hero Builder**—swap between curated gradients, adjust corner radius, and copy the Tailwind classes used in the trending widget card screenshot.
- Toggle props in isolation without touching the main chat experience.
- Jump back to the core app via the “Back to app” button when you’re done experimenting.

The playground lives at `src/pages/WidgetPlayground.tsx` and is routed via a simple path check in `src/App.tsx`. Feel free to fork this page for design reviews or copy/paste snippets into new widgets.

---

Questions or ideas for expanding the kit? Drop them in the Sherpa design channel before adding new primitives so the dashboard keeps a tight visual rhythm.
