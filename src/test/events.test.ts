import { describe, expect, it, beforeEach } from 'vitest'

import { emit, readEvents } from '../utils/events'

describe('events', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists emitted events to localStorage', () => {
    emit({ name: 'panel.open', payload: { id: 'abc' } })
    const stored = JSON.parse(window.localStorage.getItem('events') ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('panel.open')
    expect(stored[0].payload).toEqual({ id: 'abc' })
    expect(typeof stored[0].ts).toBe('number')
  })

  it('reads back events safely', () => {
    emit({ name: 'panel.reorder', payload: { id: 'abc', direction: 'up' } })
    const events = readEvents()
    expect(events[0].name).toBe('panel.reorder')
    expect(events[0].payload).toMatchObject({ direction: 'up' })
  })
})
