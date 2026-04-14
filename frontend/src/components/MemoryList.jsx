// src/components/MemoryList.jsx
import React from 'react'

function MemoryList({ memories, onSelect }) {
  if (!memories || memories.length === 0) {
    return (
      <div className="tree-list" aria-label="Memory list">
        <div className="tree-list-item">No memories have been saved yet.</div>
      </div>
    )
  }

  return (
    <div className="tree-list" aria-label="Memory list">
      {memories.map((m) => {
        const dateLabel = m.year
          ? `Around: ${m.year}`
          : new Date(m.createdAt).toLocaleDateString()

        return (
          <button
            key={m.id}
            type="button"
            className="tree-list-item"
            onClick={() => onSelect(m.id)}
          >
            <div>{m.title || 'Untitled memory'}</div>
            <div className="tree-list-item-meta">
              {dateLabel} • tone: {m.tone || '—'}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default MemoryList
