// ── OFFLINE DELIVERY QUEUE ───────────────────────────────────────────────────
// Drivers complete deliveries in the field, which is precisely where connectivity
// is worst. Previously a failed "Mark as Delivered" showed a toast and dropped the
// action on the floor: the status change was lost, and the proof-of-delivery photo
// had to be retaken at the customer's gate.
//
// A completion is now persisted locally first (photo included, as a Blob) and
// replayed when the network returns, so a dead zone turns an immediate action into
// a delayed one instead of a lost one.
//
// IndexedDB rather than localStorage because the payload contains a multi-megabyte
// image Blob, which localStorage cannot store.
//
// Deliberately plain async functions with no React or api-client dependency, so
// the replay rules below can be unit-tested without a browser.

const DB_NAME = 'vittorios-offline'
const DB_VERSION = 1
const STORE = 'delivery-completions'

let dbPromise = null

export const isSupported = () => typeof indexedDB !== 'undefined'

const openDb = () => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        // autoIncrement keyPath keeps insertion order, which is the order we want
        // to replay in (oldest delivery first).
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

// Runs one store operation and resolves with its request result on commit.
const withStore = async (mode, fn) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    let request
    try {
      request = fn(tx.objectStore(STORE))
    } catch (err) {
      reject(err)
      return
    }
    tx.oncomplete = () => resolve(request ? request.result : undefined)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/**
 * Persist a delivery completion for later replay.
 * `photo` is a File/Blob or null. Resolves with the new queue id.
 */
export const enqueueCompletion = ({ orderId, orderRef, photo = null, recipientName = '', note = '' }) =>
  withStore('readwrite', store => store.add({
    orderId,
    orderRef,
    photo,
    recipientName,
    note,
    queuedAt: Date.now(),
  }))

/** Every queued completion, oldest first. */
export const listCompletions = () => withStore('readonly', store => store.getAll())

export const removeCompletion = id => withStore('readwrite', store => store.delete(id))

/** Order ids that still have an un-synced completion, for the list badge. */
export const pendingOrderIds = async () => {
  try {
    const all = await listCompletions()
    return all.map(e => e.orderId)
  } catch {
    return []
  }
}

// A response with one of these statuses means the server understood the request
// and refused it — retrying cannot change the outcome, so the entry is dropped.
// Notably 401/403/429/5xx are NOT here: an expired token or a 500 must be retried,
// otherwise a queued delivery would be silently discarded on one bad attempt.
const TERMINAL_STATUSES = [400, 404, 409, 410, 422]

/**
 * Replay a list of queued completions in order.
 *
 * Split out from flushCompletions, and with `remove`/`completeDelivery` injected,
 * so the retry rules below can be unit-tested without IndexedDB or a network.
 * Resolves { synced, dropped }.
 */
export const replayCompletions = async (entries, { completeDelivery, remove }) => {
  let synced = 0
  let dropped = 0

  for (const entry of entries) {
    try {
      let body
      if (entry.photo || entry.recipientName || entry.note) {
        body = new FormData()
        if (entry.photo) body.append('photo', entry.photo, 'delivery-proof.jpg')
        if (entry.recipientName) body.append('recipientName', entry.recipientName)
        if (entry.note) body.append('note', entry.note)
      }
      await completeDelivery(entry.orderId, body)
      await remove(entry.id)
      synced++
    } catch (err) {
      const status = err?.response?.status
      if (TERMINAL_STATUSES.includes(status)) {
        // e.g. the order was already completed by another path. Dropping it keeps
        // a phantom "pending sync" badge off the driver's list forever.
        await remove(entry.id)
        dropped++
      } else {
        // Still offline (no response at all) or a retryable server error. Leave the
        // rest queued and stop, rather than hammering a connection that is down.
        break
      }
    }
  }

  return { synced, dropped }
}

/**
 * Flush every queued completion, oldest first.
 * Resolves { synced, dropped, remaining }.
 */
export const flushCompletions = async (completeDelivery) => {
  let entries
  try {
    entries = await listCompletions()
  } catch {
    return { synced: 0, dropped: 0, remaining: 0 }
  }

  const { synced, dropped } = await replayCompletions(entries, {
    completeDelivery,
    remove: removeCompletion,
  })

  const remaining = (await listCompletions().catch(() => [])).length
  return { synced, dropped, remaining }
}
