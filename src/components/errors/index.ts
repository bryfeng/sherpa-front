/**
 * Error Boundary Components
 *
 * Hierarchical error boundaries for catching and recovering from errors:
 * - AppErrorBoundary: Root-level, catches catastrophic errors
 * - ChatErrorBoundary: Chat section, preserves sidebar/widgets
 * - ErrorBoundary: Generic, reusable for any section
 */

export { ErrorBoundary } from './ErrorBoundary'
export type { ErrorBoundaryProps } from './ErrorBoundary'

export { AppErrorBoundary } from './AppErrorBoundary'
export { ChatErrorBoundary } from './ChatErrorBoundary'
