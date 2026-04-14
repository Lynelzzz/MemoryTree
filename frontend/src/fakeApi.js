// localStorage-backend fake backend

const SESSIONS_KEY = 'memorytree_sessions'
const MEMORIES_KEY = 'memorytree_memories'

function load(key) {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

// Sessions

export function createSession(data) {
  const sessions = load(SESSIONS_KEY)
  const now = new Date().toISOString()
  const session = {
    id: crypto.randomUUID(),
    forWhom: data.forWhom || '',
    participants: data.participants || '',
    selectedPrompts: data.selectedPrompts || [],
    customPrompt: data.customPrompt || '',
    tone: data.tone || 'warm',
    length: data.length || 'medium',
    photoFileName: data.photoFileName || '',
    skipAI: !!data.skipAI,
    createdAt: now
  }
  sessions.push(session)
  save(SESSIONS_KEY, sessions)
  return session
}

export function getSession(id) {
  const sessions = load(SESSIONS_KEY)
  return sessions.find((s) => s.id === id) || null
}

// Memories

export function getMemories() {
  return load(MEMORIES_KEY)
}

export function getMemory(id) {
  const memories = load(MEMORIES_KEY)
  return memories.find((m) => m.id === id) || null
}

export function saveMemory(data) {
  const memories = load(MEMORIES_KEY)
  const now = new Date().toISOString()

  const memory = {
    id: crypto.randomUUID(),
    title: data.title || 'Untitled memory',
    text: data.text || '',
    tone: data.tone || 'neutral',
    length: data.length || 'medium',
    forWhom: data.forWhom || '',
    sessionId: data.sessionId || null,
    createdAt: now,
    markedInappropriateCount: data.markedInappropriateCount || 0,
    // approximate year of the memory
    year: data.year ?? null,
    // metadata only; separately in IndexedDB
    media: Array.isArray(data.media) ? data.media : []
  }

  memories.push(memory)
  save(MEMORIES_KEY, memories)
  return memory
}

export function deleteMemory(id) {
  const memories = load(MEMORIES_KEY)
  const filtered = memories.filter((m) => m.id !== id)
  save(MEMORIES_KEY, filtered)
}

export function deleteAllData() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(MEMORIES_KEY)
  window.localStorage.removeItem(SESSIONS_KEY)
}

export function exportAllMemories() {
  return load(MEMORIES_KEY)
}

// Update (edit title/text/year)

export function updateMemory(id, updates) {
  const memories = load(MEMORIES_KEY)
  const idx = memories.findIndex((m) => m.id === id)
  if (idx === -1) return null

  const current = memories[idx]
  const next = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt
  }

  memories[idx] = next
  save(MEMORIES_KEY, memories)
  return next
}