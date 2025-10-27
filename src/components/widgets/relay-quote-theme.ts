const CHIP_BASE = 'inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold text-[var(--text)] transition hover:bg-[var(--hover)]'

const shared = {
  section: 'rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-sm',
  statCard: 'rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 space-y-1 text-[var(--text)]',
  statLabel: 'text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]',
  statValue: 'text-lg font-semibold text-[var(--text)]',
  statHelper: 'text-xs text-[var(--text-muted)]',
  helper: 'text-[var(--text-muted)]',
  chip: {
    base: CHIP_BASE,
    active: 'bg-[var(--accent)] text-[var(--text-inverse)] border-transparent shadow-sm hover:bg-[var(--accent-600)]',
  },
  metaChip:
    'inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-medium text-[var(--text-muted)]',
  summaryCard:
    'rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--text)] flex items-center justify-between gap-3',
  summaryValue: 'font-mono text-sm text-[var(--text)] truncate',
  toggle:
    'inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--hover)]',
  promptPill:
    'inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--hover)]',
  actionPrimary:
    'inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-sm transition hover:bg-[var(--accent-600)] disabled:cursor-not-allowed disabled:opacity-60',
  actionSecondary:
    'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60',
  ghostAction:
    'inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-transparent px-3 py-1 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40',
  warningSection:
    'rounded-2xl border border-[rgba(255,204,102,.35)] bg-[rgba(255,204,102,.12)] p-4 text-xs text-[var(--warning)]',
  errorText: 'text-[var(--danger)]',
  successText: 'text-[var(--success)]',
}

export const relayQuoteThemes = {
  swap: {
    container:
      'relative rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-lg overflow-hidden',
    border: 'border-[var(--line)]',
    overlays: [
      'absolute -left-16 top-12 h-48 w-48 rounded-full bg-[rgba(90,164,255,.18)] blur-[80px]',
      'absolute right-[-40px] top-14 h-44 w-44 rounded-full bg-[rgba(41,127,240,.16)] blur-[70px]',
      'absolute bottom-[-60px] left-24 h-60 w-60 rounded-full bg-[rgba(90,164,255,.12)] blur-[100px]',
    ] as const,
    label: 'text-[var(--text-muted)]',
    accent: {
      positive: 'text-[var(--success)]',
      negative: 'text-[var(--danger)]',
      neutral: 'text-[var(--text)]',
    },
    ...shared,
  },
  bridge: {
    container:
      'relative rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-lg overflow-hidden',
    border: 'border-[var(--line)]',
    overlays: [
      'absolute -left-20 top-10 h-52 w-52 rounded-full bg-[rgba(41,127,240,.18)] blur-[90px]',
      'absolute right-[-50px] top-20 h-48 w-48 rounded-full bg-[rgba(90,164,255,.16)] blur-[80px]',
      'absolute bottom-[-70px] left-28 h-64 w-64 rounded-full bg-[rgba(90,164,255,.12)] blur-[100px]',
    ] as const,
    label: 'text-[var(--text-muted)]',
    accent: {
      positive: 'text-[var(--success)]',
      negative: 'text-[var(--danger)]',
      neutral: 'text-[var(--text)]',
    },
    ...shared,
  },
} as const

export type RelayQuoteThemeKey = keyof typeof relayQuoteThemes
