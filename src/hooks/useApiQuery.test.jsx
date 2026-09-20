import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useApiQuery } from './useApiQuery'

/** A promise whose settlement the test controls. */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useApiQuery', () => {
  it('resolves data and clears loading', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { data: { id: 1 } } })

    const { result } = renderHook(() => useApiQuery(fetcher, []))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ id: 1 })
    expect(result.current.error).toBeNull()
  })

  it('applies `select` to the raw response', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { data: [1, 2, 3] } })

    const { result } = renderHook(() =>
      useApiQuery(fetcher, [], { select: (res) => [...res.data.data].reverse() }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([3, 2, 1])
  })

  // The bug this hook exists to prevent: without a sequence guard, a slow earlier
  // request resolves after a newer one and overwrites it. This is exactly what
  // shipped in ProductPage's price-history fetch (wrong tier's data on screen).
  it('discards a stale response that resolves after a newer one', async () => {
    const first = deferred()
    const second = deferred()
    const fetcher = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const { result, rerender } = renderHook(
      ({ dep }) => useApiQuery(fetcher, [dep]),
      { initialProps: { dep: 'a' } },
    )

    rerender({ dep: 'b' })

    // Newer request settles first…
    await act(async () => { second.resolve({ data: { data: 'newer' } }) })
    await waitFor(() => expect(result.current.data).toBe('newer'))

    // …then the older one arrives late and must be ignored.
    await act(async () => { first.resolve({ data: { data: 'stale' } }) })

    expect(result.current.data).toBe('newer')
  })

  it('aborts the in-flight request on unmount', async () => {
    let capturedSignal
    const fetcher = vi.fn(({ signal }) => {
      capturedSignal = signal
      return new Promise(() => {}) // never settles
    })

    const { unmount } = renderHook(() => useApiQuery(fetcher, []))

    expect(capturedSignal.aborted).toBe(false)
    unmount()
    expect(capturedSignal.aborted).toBe(true)
  })

  it('does not fetch when disabled, and reports loading false', () => {
    const fetcher = vi.fn()

    const { result } = renderHook(() => useApiQuery(fetcher, [], { enabled: false }))

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })

  it('treats an aborted request as an expected outcome, not an error', async () => {
    const cancelError = Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' })
    const fetcher = vi.fn().mockRejectedValue(cancelError)

    const { result } = renderHook(() => useApiQuery(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('exposes a real error and leaves data untouched', async () => {
    const boom = Object.assign(new Error('boom'), { response: { status: 500 } })
    const fetcher = vi.fn().mockRejectedValue(boom)

    const { result } = renderHook(() => useApiQuery(fetcher, [], { initialData: ['seed'] }))

    await waitFor(() => expect(result.current.error).toBe(boom))
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(['seed'])
  })

  it('refetch() re-runs the fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { data: 'x' } })

    const { result } = renderHook(() => useApiQuery(fetcher, []))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(1)

    act(() => result.current.refetch())

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('does not refetch when the fetcher identity changes (it is read via ref)', async () => {
    const first = vi.fn().mockResolvedValue({ data: { data: 1 } })
    const second = vi.fn().mockResolvedValue({ data: { data: 2 } })

    const { result, rerender } = renderHook(
      ({ fn }) => useApiQuery(fn, ['stable']),
      { initialProps: { fn: first } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // New inline function identity, same deps → must NOT trigger a refetch.
    rerender({ fn: second })

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })
})
