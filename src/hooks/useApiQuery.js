import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useApiQuery — data fetching with cancellation and stale-response protection.
 *
 * Replaces the hand-rolled `useState(loading)` + `.then(setData)` pattern that
 * appeared in 33 files. Two invariants it guarantees that the hand-rolled
 * version did not:
 *
 *  1. **Cancellation.** An `AbortController` is created per run and aborted on
 *     cleanup, so unmounting or changing a dep cancels the in-flight request
 *     instead of letting it resolve into an unmounted component. `fetcher`
 *     receives `{ signal }` — pass it to axios as `api.get(url, { signal })`.
 *  2. **Stale-response protection.** A monotonic sequence ref means a slow
 *     earlier response can never overwrite a newer one. This is the same guard
 *     `CataloguePage` implemented inline with `fetchSeq`; centralising it stops
 *     the fix from being per-page folklore (the missing version of it caused a
 *     real bug in ProductPage's price-history fetch).
 *
 * `fetcher` is read through a ref, so it does NOT need to be memoised and does
 * not itself retrigger the effect — only `deps` do. That removes the
 * "infinite refetch because my callback identity changed" footgun.
 *
 * @param {(ctx: { signal: AbortSignal }) => Promise<any>} fetcher
 * @param {any[]} deps — values that should retrigger the fetch
 * @param {{ enabled?: boolean, initialData?: any, select?: (res: any) => any }} [options]
 */
export function useApiQuery(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null, select } = options

  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [reloadKey, setReloadKey] = useState(0)

  const seq = useRef(0)
  const fetcherRef = useRef(fetcher)
  const selectRef = useRef(select)

  // Keep the latest callbacks in refs so `fetcher` does not need to be
  // memoised by callers. Assigned in an effect (not during render) because
  // mutating a ref during render is unsafe under concurrent rendering.
  // Declared before the fetch effect below so it commits first.
  useEffect(() => {
    fetcherRef.current = fetcher
    selectRef.current = select
  })

  const refetch = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()
    const mySeq = ++seq.current
    let settled = false

    // Fetching is "synchronizing with an external system", and its loading
    // state is intrinsic to that sync — the rule's cascading-render concern
    // does not apply to the mount/refetch transitions here, which are
    // infrequent and intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.resolve(fetcherRef.current({ signal: controller.signal }))
      .then((res) => {
        // Stale-response guard: a slower earlier run must never overwrite a
        // newer one. This is the bug that shipped in ProductPage's
        // price-history fetch when it was hand-rolled without a sequence ref.
        if (mySeq !== seq.current) return
        settled = true
        const value = selectRef.current ? selectRef.current(res) : (res?.data?.data ?? res?.data ?? res)
        setData(value ?? null)
      })
      .catch((err) => {
        // An aborted request is an expected outcome, not an error to surface.
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || controller.signal.aborted) return
        if (mySeq !== seq.current) return
        settled = true
        setError(err)
      })
      .finally(() => {
        if (mySeq !== seq.current) return
        if (settled || !controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
    // `deps` is a caller-supplied dependency list — spreading it here is the
    // entire point of the hook. The exhaustive-deps rule cannot verify a
    // spread, so this is a deliberate suppression, not an oversight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadKey, ...deps])

  return {
    data,
    error,
    loading: enabled ? loading : false,
    refetch,
    /** Local override, e.g. optimistic update after a mutation. */
    setData,
  }
}

/**
 * useAbortableEffect — for side effects that are not "fetch a value into
 * state" (one-shot lookups, imperative work). Gives you the abort signal and
 * runs cleanup correctly; pairs with `useApiQuery` so neither pattern needs to
 * be hand-written per page.
 *
 * @param {(signal: AbortSignal) => void|Promise<void>} effect
 * @param {any[]} deps
 */
export function useAbortableEffect(effect, deps = []) {
  const effectRef = useRef(effect)

  // Assigned in an effect rather than during render — mutating a ref during
  // render is unsafe under concurrent rendering. Declared first so it commits
  // before the effect below reads it.
  useEffect(() => {
    effectRef.current = effect
  })

  useEffect(() => {
    const controller = new AbortController()
    effectRef.current(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default useApiQuery
