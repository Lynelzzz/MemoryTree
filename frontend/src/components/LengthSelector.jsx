import React from 'react'

const LENGTHS = [
  { id: 'short', label: 'Short (a few sentences)' },
  { id: 'medium', label: 'Medium (one paragraph)' },
  { id: 'long', label: 'Longer (two-three paragraphs)' }
]

function LengthSelector({ value, onChange }) {
  return (
    <div className="length-row" role="radiogroup" aria-label="Choose the length of the story">
      {LENGTHS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`tone-pill ${value === l.id ? 'selected' : ''}`}
          onClick={() => onChange(l.id)}
          role="radio"
          aria-checked={value === l.id}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

export default LengthSelector
