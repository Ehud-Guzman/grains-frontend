import { describe, test, expect, vi } from 'vitest'
import { replayCompletions } from './offlineQueue'

// The replay rules are the part that can silently lose a delivery, so they are
// tested directly rather than through IndexedDB.
const entry = (id, orderId = `order-${id}`) => ({
  id, orderId, orderRef: `REF-${id}`, photo: null, recipientName: '', note: '',
})

const collect = () => {
  const removed = []
  return { removed, remove: async (id) => { removed.push(id) } }
}

describe('offlineQueue.replayCompletions', () => {
  test('syncs every entry in order and removes each on success', async () => {
    const calls = []
    const { removed, remove } = collect()

    const result = await replayCompletions([entry(1), entry(2)], {
      completeDelivery: async (orderId) => { calls.push(orderId) },
      remove,
    })

    expect(result).toEqual({ synced: 2, dropped: 0 })
    expect(calls).toEqual(['order-1', 'order-2'])
    expect(removed).toEqual([1, 2])
  })

  test('keeps succeeding entries removed even when a later one fails', async () => {
    const { removed, remove } = collect()
    const err = Object.assign(new Error('offline'), { response: undefined })

    const result = await replayCompletions([entry(1), entry(2)], {
      completeDelivery: async (orderId) => { if (orderId === 'order-2') throw err },
      remove,
    })

    expect(result).toEqual({ synced: 1, dropped: 0 })
    // Entry 2 is still queued — deliberately not removed.
    expect(removed).toEqual([1])
  })

  test('leaves the queue intact and stops trying while still offline', async () => {
    // No `response` means the request never reached the server.
    const err = Object.assign(new Error('Network Error'), { response: undefined })
    const completeDelivery = vi.fn(async () => { throw err })
    const { removed, remove } = collect()

    const result = await replayCompletions([entry(1), entry(2), entry(3)], {
      completeDelivery, remove,
    })

    expect(result).toEqual({ synced: 0, dropped: 0 })
    // Only the first is attempted: hammering a connection that is down is pointless.
    expect(completeDelivery).toHaveBeenCalledTimes(1)
    expect(removed).toEqual([])
  })

  test.each([400, 404, 409, 410, 422])(
    'drops an entry the server refuses with %i (retrying cannot help)',
    async (status) => {
      const err = Object.assign(new Error('refused'), { response: { status } })
      const { removed, remove } = collect()

      const result = await replayCompletions([entry(1)], {
        completeDelivery: async () => { throw err },
        remove,
      })

      expect(result).toEqual({ synced: 0, dropped: 1 })
      expect(removed).toEqual([1])
    }
  )

  test.each([401, 403, 429, 500, 503])(
    'keeps an entry on %i so a bad token or outage cannot discard a real delivery',
    async (status) => {
      const err = Object.assign(new Error('retryable'), { response: { status } })
      const { removed, remove } = collect()

      const result = await replayCompletions([entry(1)], {
        completeDelivery: async () => { throw err },
        remove,
      })

      expect(result).toEqual({ synced: 0, dropped: 0 })
      expect(removed).toEqual([])
    }
  )

  test('sends recipientName and note as FormData when present', async () => {
    let body
    await replayCompletions(
      [{ id: 1, orderId: 'o1', photo: null, recipientName: 'Mary', note: 'Left with guard' }],
      { completeDelivery: async (_id, b) => { body = b }, remove: async () => {} }
    )

    expect(body).toBeInstanceOf(FormData)
    expect(body.get('recipientName')).toBe('Mary')
    expect(body.get('note')).toBe('Left with guard')
  })

  test('sends no body at all for a bare two-tap completion', async () => {
    let body = 'unset'
    await replayCompletions(
      [{ id: 1, orderId: 'o1', photo: null, recipientName: '', note: '' }],
      { completeDelivery: async (_id, b) => { body = b }, remove: async () => {} }
    )

    // Nothing to attach — the endpoint accepts a bodyless completion.
    expect(body).toBeUndefined()
  })

  test('does nothing when the queue is empty', async () => {
    const completeDelivery = vi.fn()
    const { removed, remove } = collect()

    expect(await replayCompletions([], { completeDelivery, remove }))
      .toEqual({ synced: 0, dropped: 0 })
    expect(completeDelivery).not.toHaveBeenCalled()
    expect(removed).toEqual([])
  })
})
