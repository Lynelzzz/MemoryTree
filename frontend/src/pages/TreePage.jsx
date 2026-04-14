import React, { useMemo, useState } from 'react'
import MemoryTreeView from '../components/MemoryTreeView.jsx'
import { getMemories } from '../fakeApi.js'
import { useNavigate } from 'react-router-dom'

function toYear(m) {
  if (m?.year != null && !Number.isNaN(Number(m.year))) return Number(m.year)
  if (m?.createdAt) {
    const d = new Date(m.createdAt)
    if (!Number.isNaN(d.getTime())) return d.getFullYear()
  }
  return null
}

// new -> old
function compareByTime(b, a) {
  const ya = toYear(a)
  const yb = toYear(b)

  if (ya != null && yb != null) return ya - yb
  if (ya != null && yb == null) return -1
  if (ya == null && yb != null) return 1

  const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
  const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
  return ta - tb
}

function TreePage() {
  const navigate = useNavigate()

  const [tone, setTone] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  // expanded year groups (empty = all collapsed)
  const [expandedYears, setExpandedYears] = useState(new Set())

  const memories = useMemo(() => {
    const all = getMemories()

    const filtered =
      tone === 'all' ? all : all.filter((m) => (m.tone || '').toLowerCase() === tone)

    return [...filtered].sort(compareByTime)
  }, [tone])

  // group by year, newest first, unknown at the end
  const groupedByYear = useMemo(() => {
    const groups = new Map()
    for (const m of memories) {
      const y = toYear(m)
      const key = y != null ? String(y) : '—'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(m)
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === '—') return 1
      if (b === '—') return -1
      return Number(b) - Number(a)
    })
  }, [memories])

  function toggleYear(yearKey) {
    setExpandedYears((prev) => {
      const next = new Set(prev)
      if (next.has(yearKey)) next.delete(yearKey)
      else next.add(yearKey)
      return next
    })
  }

  const selected = useMemo(
    () => memories.find((m) => m.id === selectedId) || null,
    [memories, selectedId]
  )

  return (
    <div className="card card-soft">
      <h1 className="page-title">Your MemoryTree</h1>
      <p className="page-subtitle">
        Each piece of text you have agreed to keep grows into a small node here. You can view your memories as a "tree"
        or through a more precise list view.
      </p>

      <div style={{ marginTop: '1rem' }}>
        <select
          className="input"
          style={{ maxWidth: 260 }}
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          aria-label="Filter by tone"
        >
          <option value="all">All tones</option>
          <option value="warm">Warm</option>
          <option value="light">Light</option>
          <option value="neutral">Neutral</option>
          <option value="calm">Calm</option>
        </select>
      </div>

      <div className="tree-layout" style={{ marginTop: '1rem' }}>
        <div className="tree-left">
          <MemoryTreeView
            memories={memories}
            onSelect={(id) => setSelectedId(id)}
            onOpen={(id) => navigate(`/memory/${id}`)}
          />
        </div>

        <aside className="tree-right" aria-label="Accessible list view">
          <div className="list-header">
            <div>
              <h2 className="list-title-h2">Accessible list view</h2>
              <div className="list-subtitle">Single click: preview • Double click: open</div>
            </div>
            <div className="list-count">{memories.length} leaf/leaves</div>
          </div>

          <div className="list-panel nice-list">
            {memories.length === 0 ? (
              <div className="list-empty">No memories yet.</div>
            ) : (
              groupedByYear.map(([yearKey, items]) => {
                const isCollapsed = !expandedYears.has(yearKey)
                return (
                  <div key={yearKey} className="year-group">
                    <button
                      type="button"
                      className="year-group-header"
                      onClick={() => toggleYear(yearKey)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="year-group-label">{yearKey}</span>
                      <span className="year-group-count">{items.length} {items.length === 1 ? 'memory' : 'memories'}</span>
                      <span className="year-group-chevron" aria-hidden="true">{isCollapsed ? '▶' : '▼'}</span>
                    </button>

                    {!isCollapsed && items.map((m) => {
                      const isActive = m.id === selectedId
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`nice-list-item ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedId(m.id)}
                          onDoubleClick={() => navigate(`/memory/${m.id}`)}
                        >
                          <div className="nice-list-left">
                            <div className="nice-dot" aria-hidden="true" />
                          </div>
                          <div className="nice-list-body">
                            <div className="nice-title">{m.title || 'Untitled memory'}</div>
                            <div className="nice-meta">
                              tone: {m.tone || '—'}
                              {m.forWhom ? ` • for: ${m.forWhom}` : ''}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {selected && (
            <div className="list-detail-card" aria-label="Selected memory summary">
              <div className="list-detail-title">{selected.title || 'Untitled memory'}</div>
              <div className="list-detail-meta">
                Around: {toYear(selected) ?? '—'} • tone: {selected.tone || '—'}
              </div>
              <div className="list-detail-snippet">
                {(selected.text || '').trim().slice(0, 220)}
                {(selected.text || '').trim().length > 220 ? '…' : ''}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default TreePage
