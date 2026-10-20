// setInterval that does not poll a tab nobody is looking at.
//
// 2026-10 audit (F-34): dashboards, the order list, the activity log, customer order detail and the driver
// list polled every 30-60 s forever, including from background tabs - hundreds of pointless requests per
// idle hour per open tab, each costing Render CPU. This skips ticks while the page is hidden and, if one was
// skipped, refreshes straight away when the tab becomes visible again so the screen is never left stale.
// Returns the function that stops it (use it as the effect cleanup).
export function startVisiblePolling(fn, intervalMs) {
  let skipped = false

  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) { skipped = true; return }
    fn()
  }
  const onVisible = () => {
    if (skipped && !document.hidden) { skipped = false; fn() }
  }

  const id = setInterval(tick, intervalMs)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)

  return () => {
    clearInterval(id)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
  }
}
