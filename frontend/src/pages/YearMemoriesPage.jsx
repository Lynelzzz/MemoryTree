import React, { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getMemories } from '../fakeApi.js'

function toYear(m) {
  if (m?.year != null && !Number.isNaN(Number(m.year))) return Number(m.year)
  if (m?.createdAt) {
    const d = new Date(m.createdAt)
    if (!Number.isNaN(d.getTime())) return d.getFullYear()
  }
  return null
}

function YearMemoriesPage() {
  const { year } = useParams()
  const navigate = useNavigate()

  const memories = useMemo(() => {
    const all = getMemories()
    if (year === '—') return all.filter((m) => toYear(m) == null)
    const y = Number(year)
    return all.filter((m) => toYear(m) === y)
  }, [year])

  const heading = year === '—' ? 'Memories without a year' : `Memories from ${year}`

  return (
    <div className="card card-soft">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => navigate('/tree')}
        style={{ marginBottom: '0.8rem', alignSelf: 'flex-start' }}
      >
        ← Back to MemoryTree
      </button>

      <h2 className="page-title">{heading}</h2>
      <p className="page-subtitle">
        {memories.length} {memories.length === 1 ? 'memory' : 'memories'} • click a title to open it.
      </p>

      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
        {memories.length === 0 ? (
          <div className="list-empty">No memories found.</div>
        ) : (
          memories.map((m) => (
            <Link key={m.id} to={`/memory/${m.id}`} className="year-memory-item">
              <div className="year-memory-title">{m.title || 'Untitled memory'}</div>
              <div className="year-memory-meta">
                tone: {m.tone || '—'}
                {m.forWhom ? ` • for: ${m.forWhom}` : ''}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default YearMemoriesPage
