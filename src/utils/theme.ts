export type ThemeTokens = {
  background: string
  surface: string
  surfaceElevated: string
  line: string
  text: string
  textMuted: string
  accent: string
  success: string
  danger: string
}

const FALLBACK_TOKENS: ThemeTokens = {
  background: '#0b0d12',
  surface: '#131a22',
  surfaceElevated: '#171f29',
  line: '#1e2733',
  text: '#e7eef7',
  textMuted: '#a8b3c2',
  accent: '#5aa4ff',
  success: '#5fd39a',
  danger: '#ff6b6b',
}

function readCustomProp(style: CSSStyleDeclaration, name: string, fallback: string): string {
  return style.getPropertyValue(name)?.trim() || fallback
}

export function readThemeTokens(): ThemeTokens {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return FALLBACK_TOKENS
  }
  const style = window.getComputedStyle(document.documentElement)
  return {
    background: readCustomProp(style, '--bg', FALLBACK_TOKENS.background),
    surface: readCustomProp(style, '--surface', FALLBACK_TOKENS.surface),
    surfaceElevated: readCustomProp(style, '--surface-2', FALLBACK_TOKENS.surfaceElevated),
    line: readCustomProp(style, '--line', FALLBACK_TOKENS.line),
    text: readCustomProp(style, '--text', FALLBACK_TOKENS.text),
    textMuted: readCustomProp(style, '--text-muted', FALLBACK_TOKENS.textMuted),
    accent: readCustomProp(style, '--accent', FALLBACK_TOKENS.accent),
    success: readCustomProp(style, '--success', FALLBACK_TOKENS.success),
    danger: readCustomProp(style, '--danger', FALLBACK_TOKENS.danger),
  }
}

export function withAlpha(color: string, alpha: number): string {
  if (!color) return `rgba(15, 23, 42, ${alpha})`
  if (color.startsWith('rgba')) {
    const parts = color.replace(/rgba\(|\)/g, '').split(',').map((part) => part.trim())
    const [r = '0', g = '0', b = '0'] = parts
    return `rgba(${Number(r)}, ${Number(g)}, ${Number(b)}, ${alpha})`
  }
  if (color.startsWith('rgb')) {
    const parts = color.replace(/rgb\(|\)/g, '').split(',').map((part) => part.trim())
    const [r = '0', g = '0', b = '0'] = parts
    return `rgba(${Number(r)}, ${Number(g)}, ${Number(b)}, ${alpha})`
  }
  let hex = color.replace('#', '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
  }
  const num = Number.parseInt(hex, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
