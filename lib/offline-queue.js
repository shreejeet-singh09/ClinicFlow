const DB_NAME = 'CarePair-offline'
const STORE_NAME = 'pending-actions'

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'))
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'action_id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function queueOfflineAction(action) {
  const db = await openDatabase()
  const record = { action_id: crypto.randomUUID(), device_id: getDeviceId(), sync_status: 'pending', created_at: new Date().toISOString(), ...action }
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
  return record
}

export async function getPendingActions() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => { const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error) })
}

export async function clearOfflineAction(actionId) {
  const db = await openDatabase()
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).delete(actionId); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
}

export function getDeviceId() {
  const key = 'CarePair-device-id'
  let id = sessionStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id) }
  return id
}