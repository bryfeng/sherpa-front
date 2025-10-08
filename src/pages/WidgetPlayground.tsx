import React from 'react'
import {
  WidgetButton,
  WidgetCard,
  WidgetHeader,
  WidgetSection,
  WidgetStat,
  WidgetStatGrid,
} from '../components/widgets/widget-kit'

const gradientPresets = [
  {
    id: 'glacier-ice',
    label: 'Glacier Ice',
    gradientClass: 'bg-gradient-to-br from-[#4ea0ff] via-[#87c8ff] to-[#f2f9ff]',
    headerTint: 'text-white/80',
    bodyTint: 'text-white/95',
    buttonText: 'text-[#0b3d91]',
    chipBorder: 'border-white/60',
    chipBackground: 'bg-white/15',
    chipPositive: 'text-[#0f7a5c]',
    chipNegative: 'text-[#d3355c]',
    chipNeutral: 'text-[#144b8a]',
  },
  {
    id: 'frosted-horizon',
    label: 'Frosted Horizon',
    gradientClass: 'bg-gradient-to-br from-[#1e66f5] via-[#36a2f5] to-[#9fd7ff]',
    headerTint: 'text-sky-100',
    bodyTint: 'text-white',
    buttonText: 'text-[#0e4a88]',
    chipBorder: 'border-white/55',
    chipBackground: 'bg-white/12',
    chipPositive: 'text-[#0c6f56]',
    chipNegative: 'text-[#e3566f]',
    chipNeutral: 'text-[#103d73]',
  },
  {
    id: 'midnight-glacier',
    label: 'Midnight Glacier',
    gradientClass: 'bg-gradient-to-br from-[#07264a] via-[#0c4a7d] to-[#6cc6ff]',
    headerTint: 'text-slate-200/90',
    bodyTint: 'text-slate-100',
    buttonText: 'text-[#0b3d91]',
    chipBorder: 'border-white/40',
    chipBackground: 'bg-white/10',
    chipPositive: 'text-[#aef9ff]',
    chipNegative: 'text-[#ffc1cd]',
    chipNeutral: 'text-white',
  },
] as const

const sampleStats = [
  { label: 'Gas Saved', value: '42%', helper: 'vs. manual bridging', tone: 'accent' as const },
  { label: 'Chains Covered', value: '8', helper: 'EVM + Solana', tone: 'default' as const },
  { label: 'Quotes Today', value: '96', helper: 'Auto-refreshed', tone: 'muted' as const },
  { label: 'Alerts', value: '2', helper: 'Check needs attention', tone: 'warning' as const },
]

export default function WidgetPlayground() {
  const [autoRefresh, setAutoRefresh] = React.useState(true)
  const [gradientId, setGradientId] = React.useState<(typeof gradientPresets)[number]['id']>('glacier-ice')
  const [cornerRadius, setCornerRadius] = React.useState(28)

  const gradient = React.useMemo(() => gradientPresets.find((preset) => preset.id === gradientId) ?? gradientPresets[0], [gradientId])

  const tokenPills = React.useMemo(
    () => [
      { symbol: 'UDS', change: '-8.67%', tone: 'negative' as const },
      { symbol: 'ZEC', change: '+21.72%', tone: 'positive' as const },
      { symbol: 'FORM', change: '+13.15%', tone: 'positive' as const },
    ],
    [],
  )

  const chipBase =
    `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm transition ${gradient.chipBorder} ${gradient.chipBackground}`

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-5xl px-6 space-y-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Widget Kit Playground</h1>
            <p className="text-sm text-slate-600">
              Explore layout primitives without touching the main Sherpa experience. Tweak props, swap components, and
              copy examples into production widgets.
            </p>
          </div>
          <WidgetButton
            variant="secondary"
            size="md"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            Back to app
          </WidgetButton>
        </header>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Gradient Hero Builder</h2>
            <div className="flex flex-wrap gap-2">
              {gradientPresets.map((preset) => (
                <WidgetButton
                  key={preset.id}
                  variant={preset.id === gradientId ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setGradientId(preset.id)}
                >
                  {preset.label}
                </WidgetButton>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <div
                className={`relative overflow-hidden p-6 text-white shadow-2xl ${gradient.gradientClass}`}
                style={{ borderRadius: `${cornerRadius}px` }}
              >
                <div className={`text-xs uppercase tracking-[0.24em] font-semibold ${gradient.headerTint}`}>Trending right now</div>
                <div className="mt-2 text-2xl font-semibold">Relay-ready tokens</div>
                <div className={`mt-1 text-sm ${gradient.bodyTint}`}>Updated {autoRefresh ? '0s' : '12s'} ago</div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`inline-flex items-center rounded-full border border-white/20 bg-white px-5 py-2 text-sm font-semibold shadow-sm transition hover:bg-white/90 ${gradient.buttonText}`}
                  >
                    View feed
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {tokenPills.map((token) => (
                    <button
                      key={token.symbol}
                      type="button"
                      className={`${chipBase} ${
                        token.tone === 'positive'
                          ? gradient.chipPositive
                          : token.tone === 'negative'
                            ? gradient.chipNegative
                            : gradient.chipNeutral
                      }`}
                    >
                      <span>{token.symbol}</span>
                      <span>{token.change}</span>
                    </button>
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" />
              </div>
            </div>

            <WidgetCard>
              <WidgetHeader title="Controls" subtitle="Tweak gradient widgets live" />
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div>
                  <div className="font-semibold text-slate-800">Border radius</div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={8}
                      max={48}
                      step={2}
                      value={cornerRadius}
                      onChange={(event) => setCornerRadius(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer rounded-full bg-slate-200"
                      aria-label="Border radius"
                    />
                    <span className="text-xs text-slate-500">{cornerRadius}px</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Auto refresh copy</span>
                  <WidgetButton variant="secondary" size="sm" onClick={() => setAutoRefresh((value) => !value)}>
                    {autoRefresh ? 'Auto refresh on' : 'Auto refresh off'}
                  </WidgetButton>
                </div>

                <div>
                  <div className="font-semibold text-slate-800">Gradient classes</div>
                  <div className="mt-2 rounded-lg bg-slate-900/90 p-3 text-xs font-mono text-white shadow-inner">
                    <div>bg-gradient-to-br</div>
                    <div>{gradient.gradientClass.replace('bg-gradient-to-br ', '')}</div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Copy these Tailwind utilities into any widget surface to mirror the gradient above.
                  </p>
                </div>
              </div>
            </WidgetCard>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Card + Header + Actions</h2>
          <WidgetCard>
            <WidgetHeader
              title="Relay Snapshot"
              subtitle="Synthetic demo data"
              actions={
                <WidgetButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoRefresh((value) => !value)}
                  aria-pressed={autoRefresh}
                >
                  {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
                </WidgetButton>
              }
            />
            <div className="mt-4 space-y-4">
              <WidgetStatGrid columns={4}>
                {sampleStats.map((stat) => (
                  <WidgetStat
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    helper={stat.helper}
                    tone={stat.tone}
                    helperTone={stat.tone === 'accent' ? 'default' : 'muted'}
                  />
                ))}
              </WidgetStatGrid>
              <WidgetSection className="space-y-2">
                <div className="text-sm font-semibold text-slate-900">Usage ideas</div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                  <li>Keep stat grids to two rows max; switch to tabs for larger data sets.</li>
                  <li>
                    Set <code>tone=&quot;accent&quot;</code> sparingly so major callouts stand out.
                  </li>
                  <li>
                    Pair <code>WidgetSection</code> with <code>space-y-*</code> utilities for vertical rhythm.
                  </li>
                </ul>
              </WidgetSection>
            </div>
          </WidgetCard>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Hotspots + Actions</h2>
          <WidgetCard>
            <WidgetHeader title="Action Palette" subtitle="Compose prompts and CTAs" />
            <WidgetSection tone="accent" className="space-y-2">
              <div className="text-sm font-semibold">Trending Chains</div>
              <div className="flex flex-wrap gap-2">
                {['Base', 'Arbitrum', 'Optimism'].map((chain) => (
                  <WidgetButton
                    key={chain}
                    variant="secondary"
                    onClick={() => window.alert(`Pretend to open prompt for ${chain}`)}
                  >
                    Bridge to {chain}
                  </WidgetButton>
                ))}
              </div>
            </WidgetSection>
            <WidgetSection className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Quick Prompts</div>
              <div className="flex flex-wrap gap-2">
                {['Refresh swap quote', 'Check bridge fees', 'Find arbitrage'].map((prompt) => (
                  <WidgetButton
                    key={prompt}
                    size="sm"
                    variant="ghost"
                    onClick={() => window.alert(`Pretend to insert prompt: ${prompt}`)}
                  >
                    {prompt}
                  </WidgetButton>
                ))}
              </div>
            </WidgetSection>
          </WidgetCard>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Tone Reference</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {['default', 'accent', 'muted', 'warning', 'danger'].map((tone) => (
              <WidgetSection key={tone} tone={tone as any} className="space-y-1">
                <div className="text-sm font-semibold capitalize">{tone}</div>
                <p className="text-xs text-slate-600">
                  Use this surface to communicate {tone === 'default' ? 'neutral info' : `${tone} level emphasis`}.
                </p>
              </WidgetSection>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
