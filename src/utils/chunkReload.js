// A deploy renames every hashed JS chunk, so a tab opened before the deploy asks for files that no
// longer exist (Netlify answers with index.html, hence "MIME type text/html"). One reload fetches the
// new index.html and the new chunk names. The guard is a time window rather than a per-session flag:
// a flag set by the first deploy would suppress the reload for every later deploy in the same tab,
// while the window still stops a reload loop if the failure is something other than a stale bundle.
const RELOAD_KEY = 'chunk_reload_at'
const RELOAD_WINDOW_MS = 30 * 1000

export const isChunkLoadError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(error?.message || '')

// Returns true when it triggered a reload (the caller should render nothing more).
export const reloadForNewVersion = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sessionStorage blocked: reloading without a guard could loop, so do not.
    return false
  }
  window.location.reload()
  return true
}
