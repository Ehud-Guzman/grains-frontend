// "Your usual order" for the customer dashboard. Grain customers tend to buy on a cycle, so the most
// useful shortcut is the last completed order plus a nudge when they are probably running low.
const DAY_MS = 24 * 60 * 60 * 1000

const daysBetween = (a, b) => Math.max(0, Math.round((new Date(a) - new Date(b)) / DAY_MS))

// orders: newest first (as the API returns them). Returns null when there is nothing worth showing.
export const usualOrder = (orders = [], now = new Date()) => {
  const done = orders.filter(o => o.status === 'completed' && o.orderItems?.length)
  if (!done.length) return null

  const last = done[0]
  const daysSince = daysBetween(now, last.createdAt)

  // Typical gap between orders, needs at least two completed ones to mean anything.
  let intervalDays = null
  if (done.length >= 2) {
    const gaps = []
    for (let i = 0; i < done.length - 1; i++) gaps.push(daysBetween(done[i].createdAt, done[i + 1].createdAt))
    const sorted = gaps.filter(g => g > 0).sort((x, y) => x - y)
    if (sorted.length) intervalDays = sorted[Math.floor(sorted.length / 2)] // median: one odd gap should not skew it
  }

  // Nudge once they are 80% of the way through their usual gap; with no history, after 3 weeks.
  const threshold = intervalDays ? Math.max(3, Math.round(intervalDays * 0.8)) : 21
  return { order: last, daysSince, intervalDays, due: daysSince >= threshold }
}
