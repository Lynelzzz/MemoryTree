// IndexedDB media store

const DB_NAME = 'memorytree_media_db'
const DB_VERSION = 1
const STORE_NAME = 'files'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'))
  })
}

function withStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)

        let result
        try {
          result = fn(store)
        } catch (err) {
          reject(err)
          return
        }

        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'))
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'))
      })
  )
}

export async function saveMediaFile(file) {
  if (!file) return null
  const id = crypto.randomUUID()
  const record = {
    id,
    name: file.name || 'attachment',
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
    createdAt: new Date().toISOString(),
    blob: file
  }

  await withStore('readwrite', (store) => store.put(record))
  return {
    id,
    name: record.name,
    type: record.type,
    size: record.size
  }
}

export async function getMediaObjectUrl(id) {
  if (!id) return null
  const record = await new Promise((resolve, reject) => {
    openDb()
      .then((db) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(id)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => reject(req.error || new Error('Failed to read media record'))
      })
      .catch(reject)
  })

  if (!record || !record.blob) return null
  return URL.createObjectURL(record.blob)
}

export async function getMediaBlob(id) {
  if (!id) return null
  const record = await new Promise((resolve, reject) => {
    openDb()
      .then((db) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(id)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => reject(req.error || new Error('Failed to read media record'))
      })
      .catch(reject)
  })
  if (!record || !record.blob) return null
  return { blob: record.blob, name: record.name, type: record.type }
}

export async function deleteMedia(id) {
  if (!id) return
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearAllMedia() {
  await withStore('readwrite', (store) => store.clear())
}
