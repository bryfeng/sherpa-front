/**
 * Test render helpers and wrapper components.
 */

import React, { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ConvexReactClient } from 'convex/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock Convex client for testing
const _mockConvexClient = {
  watchQuery: vi.fn(() => ({
    onUpdate: vi.fn(),
    destroy: vi.fn(),
  })),
  mutation: vi.fn(),
  action: vi.fn(),
} as unknown as ConvexReactClient

// Mock wagmi config
const _mockWagmiConfig = {
  chains: [],
  connectors: [],
  transports: {},
} as any

/**
 * Create a fresh QueryClient for each test.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

interface TestWrapperProps {
  children: ReactNode
}

/**
 * Wrapper component that provides all necessary context providers.
 */
function TestWrapper({ children }: TestWrapperProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Custom render function that includes all providers.
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options })
}

/**
 * Minimal wrapper for components that only need basic React context.
 */
function MinimalWrapper({ children }: TestWrapperProps) {
  return <>{children}</>
}

/**
 * Render with minimal wrapper (no providers).
 */
function renderMinimal(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: MinimalWrapper, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render, renderMinimal, TestWrapper }
