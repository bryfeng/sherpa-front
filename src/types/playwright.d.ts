declare module '@playwright/test' {
  // Minimal stub for type checking in CI without pulling full Playwright types
  export type Page = any
  export const test: any
  export const expect: any
}
