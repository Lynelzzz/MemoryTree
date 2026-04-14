import React from 'react'

function PromptCardGrid({ prompts, selectedIds, onToggle }) {
  return (
    <div className="prompt-grid" role="list">
      {prompts.map((p) => {
        const selected = selectedIds.includes(p.id)
        return (
          <button
            key={p.id}
            type="button"
            className={`prompt-card ${selected ? 'selected' : ''}`}
            onClick={() => onToggle(p.id)}
            aria-pressed={selected}
            role="listitem"
          >
            <div className="prompt-title">{p.title}</div>
            <div className="prompt-desc">{p.description}</div>
            <div className="prompt-meta">
              {p.category} • suggested tone: {p.suggestedTone}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default PromptCardGrid
