import React from 'react'

const TONES = [
  { id: 'warm', label: 'Warm appreciation', desc: 'Focus on gratitude, care, and small details.' },
  { id: 'light', label: 'Light and playful', desc: 'Allow some gentle humour and shared jokes.' },
  { id: 'calm', label: 'Calm and reflective', desc: 'Stay steady, reflective and grounded.' },
  { id: 'neutral', label: 'Neutral description', desc: 'Describe what happened with minimal interpretation.' }
]

function ToneSelector({ value, onChange }) {
  return (
    <div className="tone-row" role="radiogroup" aria-label="Choose the tone of the story">
      {TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          className={`tone-pill ${value === tone.id ? 'selected' : ''}`}
          onClick={() => onChange(tone.id)}
          role="radio"
          aria-checked={value === tone.id}
        >
          <div>{tone.label}</div>
        </button>
      ))}
    </div>
  )
}

export default ToneSelector
