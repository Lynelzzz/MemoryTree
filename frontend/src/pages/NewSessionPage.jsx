import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PromptCardGrid from '../components/PromptCardGrid.jsx'
import ToneSelector from '../components/ToneSelector.jsx'
import LengthSelector from '../components/LengthSelector.jsx'
import SafetyNotice from '../components/SafetyNotice.jsx'
import { createSession } from '../fakeApi.js'

const PROMPTS = [
  {
    id: 'first-meet',
    category: 'Beginnings',
    title: 'The first time you met',
    description: 'Where were you? What was the scene like? Are there small details that still stay with you?',
    suggestedTone: 'Warm'
  },
  {
    id: 'small-laughter',
    category: 'Everyday moments',
    title: 'A tiny moment that made you both laugh',
    description: 'Maybe it was a misunderstanding, a funny sentence, or an inside joke only you share.',
    suggestedTone: 'Light'
  },
  {
    id: 'routine',
    category: 'Habits',
    title: 'A small routine that was "just yours"',
    description: 'For example, something you always used to do together, or a special greeting.',
    suggestedTone: 'Calm'
  },
  {
    id: 'support',
    category: 'Support',
    title: 'A time when they quietly supported you',
    description: 'Perhaps they did not say many words, but you knew they were there.',
    suggestedTone: 'Calm'
  }
]

function NewSessionPage() {
  const [step, setStep] = useState(1)
  const [forWhom, setForWhom] = useState('')
  const [participants, setParticipants] = useState('')
  const [selectedPrompts, setSelectedPrompts] = useState([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [tone, setTone] = useState('warm')
  const [length, setLength] = useState('medium')
  const [photoFileName, setPhotoFileName] = useState('')
  const [skipAI, setSkipAI] = useState(false)

  const navigate = useNavigate()

  const progress = useMemo(() => {
    const mapping = { 1: 33, 2: 66, 3: 100 }
    return mapping[step] || 33
  }, [step])

  function togglePrompt(id) {
    setSelectedPrompts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  function handleNext() {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  function handleCreate() {
    const session = createSession({
      forWhom,
      participants,
      selectedPrompts,
      customPrompt,
      tone,
      length,
      photoFileName,
      skipAI
    })
    navigate(`/session/${session.id}/editor`)
  }

  return (
    <div>
      <div className="stepper" aria-label="New session steps">
        <div>Step {step} / 3</div>
        <div className="stepper-bar" aria-hidden="true">
          <div className="stepper-bar-inner" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 1 && (
        <section className="card card-soft form-grid" aria-label="Participant information">
          <div>
            <h2 className="page-title">Who is this MemoryTree for?</h2>
            <p className="page-subtitle">
              You can use a nickname, like "a former colleague" or "a friend from university".
              This information only lives in your browser.
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="for-whom">
              Who is this MemoryTree for?
            </label>
            <input
              id="for-whom"
              className="input"
              placeholder="For example: a former colleague"
              value={forWhom}
              onChange={(e) => setForWhom(e.target.value)}
            />
            <div className="field-hint">
              You do not need to use a legal name. Any label that feels right and is meaningful to you is enough.
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="participants">
              Who is taking part in this session? (optional)
            </label>
            <input
              id="participants"
              className="input"
              placeholder="For example: just me"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
            <div className="field-hint">
              This is just for you to remember who was present during this co-creation.
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card card-soft form-grid" aria-label="Choose prompt cards">
          <div>
            <h2 className="page-title">Begin with a small, gentle prompt.</h2>
            <p className="page-subtitle">
              Pick 1-3 directions you feel like talking about and write it down below.
            </p>
          </div>
          <PromptCardGrid
            prompts={PROMPTS}
            selectedIds={selectedPrompts}
            onToggle={togglePrompt}
          />
          <div>
            <label className="field-label" htmlFor="custom-prompt">
              Please write your own topic for this story
            </label>
            <textarea
              id="custom-prompt"
              className="textarea"
              placeholder="For example: that night at the hospital / the last trip you took together..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card card-soft form-grid" aria-label="Tone and length">
          <div>
            <h2 className="page-title">What should this story feel like?</h2>
            <p className="page-subtitle">
              Choose an initial tone and length. You can always change the text later.
              The AI will never make decisions for you; it only offers suggestions.
            </p>
          </div>
          <div>
            <div className="field-label">Tone presets</div>
            <ToneSelector value={tone} onChange={setTone} />
          </div>
          <div>
            <div className="field-label">Length presets</div>
            <LengthSelector value={length} onChange={setLength} />
          </div>
          <SafetyNotice />
          <div style={{ marginTop: '0.4rem' }}>
            <label className="field-label">
              <input
                type="checkbox"
                checked={skipAI}
                onChange={(e) => setSkipAI(e.target.checked)}
                style={{ marginRight: '0.4rem' }}
              />
              For this story, I prefer to write entirely by myself (skip AI draft)
            </label>
          </div>
        </section>
      )}


      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" type="button" onClick={handleBack} disabled={step === 1}>
          Back
        </button>

        {step < 3 && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleNext}
            disabled={step === 1 && !forWhom.trim()}
          >
            Next
          </button>
        )}
        {step === 3 && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleCreate}
            disabled={!forWhom.trim()}
          >
            Go to editor
          </button>
        )}
      </div>
    </div>
  )
}

export default NewSessionPage
