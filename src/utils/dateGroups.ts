/**
 * Date Grouping Utilities
 *
 * Groups conversations by relative date for sidebar display.
 */

export interface ConversationSummary {
  _id: string
  title?: string
  archived: boolean
  totalTokens: number
  createdAt: number
  updatedAt: number
}

export interface ConversationGroup {
  label: string
  conversations: ConversationSummary[]
}

/**
 * Get start of day in milliseconds
 */
function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Subtract days from a date
 */
function subDays(timestamp: number, days: number): number {
  return timestamp - days * 24 * 60 * 60 * 1000
}

/**
 * Group conversations by relative date
 */
export function groupConversationsByDate(
  conversations: ConversationSummary[]
): ConversationGroup[] {
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = subDays(todayStart, 1)
  const weekStart = subDays(todayStart, 7)
  const monthStart = subDays(todayStart, 30)

  const groups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  }

  for (const conv of conversations) {
    const timestamp = conv.updatedAt

    if (timestamp >= todayStart) {
      groups['Today'].push(conv)
    } else if (timestamp >= yesterdayStart) {
      groups['Yesterday'].push(conv)
    } else if (timestamp >= weekStart) {
      groups['This Week'].push(conv)
    } else if (timestamp >= monthStart) {
      groups['This Month'].push(conv)
    } else {
      groups['Older'].push(conv)
    }
  }

  // Return only non-empty groups in order
  const orderedLabels = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']
  return orderedLabels
    .filter((label) => groups[label].length > 0)
    .map((label) => ({
      label,
      conversations: groups[label],
    }))
}

/**
 * Filter conversations by search query
 */
export function filterConversationsBySearch(
  groups: ConversationGroup[],
  query: string
): ConversationGroup[] {
  if (!query.trim()) return groups

  const lowerQuery = query.toLowerCase()

  return groups
    .map((group) => ({
      ...group,
      conversations: group.conversations.filter((conv) =>
        conv.title?.toLowerCase().includes(lowerQuery)
      ),
    }))
    .filter((group) => group.conversations.length > 0)
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  // Format as date
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
