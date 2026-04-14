import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, saveMemory } from '../fakeApi.js'
import { saveMediaFile } from '../mediaStore.js'
import ConfirmGate from '../components/ConfirmGate.jsx'

async function fetchAIDraftFromServer({ forWhom, tone, length, prompts, customPrompt }) {
  const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : ''
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forWhom, tone, length, prompts, customPrompt })
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.message || 'Failed to fetch AI draft')
  }

  const data = await response.json()
  if (!data || typeof data.draft !== 'string') {
    throw new Error('Invalid response from backend')
  }
  return data.draft
}

// derive default leaf name from topic or text
function defaultLeafName({ session, text }) {
  // prefer topic
  const fromTopic = (session?.customPrompt || '').trim()
  if (fromTopic) return fromTopic.length > 60 ? fromTopic.slice(0, 60) : fromTopic

  // fallback: first ~42 chars of text
  const s = (text || '').replace(/\s+/g, ' ').trim()
  if (!s) return 'Untitled memory'
  return s.length > 42 ? s.slice(0, 42) + '…' : s
}

function EditorPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [aiDraft, setAiDraft] = useState('')
  const [aiVersion, setAiVersion] = useState(1)
  const [aiLoading, setAiLoading] = useState(false)
  const [editorText, setEditorText] = useState('')
  const [agreedContent, setAgreedContent] = useState(false)
  const [agreedControl, setAgreedControl] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [markedInappropriateCount, setMarkedInappropriateCount] = useState(0)
  const [memoryYear, setMemoryYear] = useState('')

  // media attachments
  const [mediaItems, setMediaItems] = useState([])
  const [mediaError, setMediaError] = useState('')

  useEffect(() => {
    return () => {
      for (const item of mediaItems) {
        try { URL.revokeObjectURL(item.url) } catch (e) {}
      }
    }
  }, [mediaItems])


  // editable leaf name
  const [leafName, setLeafName] = useState('')

  useEffect(() => {
    const s = getSession(sessionId)
    if (!s) {
      navigate('/session/new')
      return
    }
    setSession(s)

    // initial leaf name before AI returns
    setLeafName((prev) => prev || defaultLeafName({ session: s, text: '' }))

    if (!s.skipAI) {
      setAiLoading(true)
      fetchAIDraftFromServer({
        forWhom: s.forWhom,
        tone: s.tone,
        length: s.length,
        prompts: s.selectedPrompts,
        customPrompt: s.customPrompt
      })
        .then((draft) => {
          setAiDraft(draft)
          setEditorText(draft)
          setStatusMessage('An AI draft has been generated. You can now edit or rewrite it freely.')

          // suggest name if not yet set
          setLeafName((prev) => prev || defaultLeafName({ session: s, text: draft }))
        })
        .catch((err) => {
          console.error(err)
          const msg = err?.message || ''
          const fallback =
            'The AI helper could not generate a draft just now. You can write directly in the editing area on the right.'
          setAiDraft(fallback)
          setEditorText('')
          setStatusMessage(msg || 'AI generation failed; showing a fallback message instead.')

          setLeafName((prev) => prev || defaultLeafName({ session: s, text: '' }))
        })
        .finally(() => {
          setAiLoading(false)
        })
    }
  }, [sessionId, navigate])

  function handleRegenerate() {
    if (!session) return
    setAiLoading(true)
    setStatusMessage('')
    fetchAIDraftFromServer({
      forWhom: session.forWhom,
      tone: session.tone,
      length: session.length,
      prompts: session.selectedPrompts,
      customPrompt: session.customPrompt
    })
      .then((draft) => {
        setAiDraft(draft)
        setEditorText(draft)
        setAiVersion((v) => v + 1)
        setStatusMessage('A new AI draft has been generated.')

        setLeafName((prev) => prev || defaultLeafName({ session, text: draft }))
      })
      .catch((err) => {
        console.error(err)
        const msg = err?.message || ''
        setStatusMessage(msg || 'The AI helper could not regenerate a draft. You can continue editing manually.')
      })
      .finally(() => {
        setAiLoading(false)
      })
  }

  function handleMarkInappropriate() {
    setMarkedInappropriateCount((c) => c + 1)
    setStatusMessage('This draft has been marked as inappropriate. You can edit it, regenerate it, or ignore it.')
  }

  function handleConfirmChange(partial) {
    if (Object.prototype.hasOwnProperty.call(partial, 'agreedContent')) {
      setAgreedContent(partial.agreedContent)
    }
    if (Object.prototype.hasOwnProperty.call(partial, 'agreedControl')) {
      setAgreedControl(partial.agreedControl)
    }
  }

  async function handleSubmit() {
    if (!editorText.trim()) {
      setStatusMessage('Before adding a story to the tree, please write at least a few sentences.')
      return
    }

    // parse year
    let yearValue = null
    if (memoryYear && memoryYear.trim()) {
      const parsed = parseInt(memoryYear.trim(), 10)
      if (!Number.isNaN(parsed)) {
        yearValue = parsed
      }
    }

    // leaf name with fallback
    const finalLeafName =
      (leafName || '').trim() ||
      defaultLeafName({ session, text: editorText })

    let mediaMetaList = []
    if (mediaItems.length > 0) {
      try {
        for (const item of mediaItems) {
          const meta = await saveMediaFile(item.file)
          mediaMetaList.push(meta)
        }
      } catch (err) {
        console.error(err)
        setStatusMessage('Could not save one of the attachments locally. Please try again or continue without them.')
        return
      }
    }

    const memory = saveMemory({
      title: finalLeafName,
      text: editorText,
      tone: session.tone,
      length: session.length,
      forWhom: session.forWhom,
      sessionId,
      markedInappropriateCount,
      year: yearValue,
      media: mediaMetaList
    })

    setStatusMessage('This story has become a new leaf on your MemoryTree.')
    navigate(`/memory/${memory.id}`)
  }


  function handleMediaChange(e) {
    setMediaError('')
    const files = Array.from((e.target.files && e.target.files.length) ? e.target.files : [])
    if (files.length === 0) return

    const MAX_BYTES = 15 * 1024 * 1024 // 15 MB
    const MAX_IMAGES = 10
    const MAX_VIDEOS = 2

    let currentImages = mediaItems.filter((it) => it.file?.type?.startsWith('image/')).length
    let currentVideos = mediaItems.filter((it) => it.file?.type?.startsWith('video/')).length

    const next = [...mediaItems]
    const skipped = []

    for (const file of files) {
      const isImage = file.type && file.type.startsWith('image/')
      const isVideo = file.type && file.type.startsWith('video/')
      if (!isImage && !isVideo) {
        skipped.push(`${file.name}: unsupported type`)
        continue
      }
      if (file.size > MAX_BYTES) {
        skipped.push(`${file.name}: too large (max 15MB)`)
        continue
      }
      if (isImage && currentImages >= MAX_IMAGES) {
        skipped.push(`${file.name}: image limit reached (${MAX_IMAGES})`)
        continue
      }
      if (isVideo && currentVideos >= MAX_VIDEOS) {
        skipped.push(`${file.name}: video limit reached (${MAX_VIDEOS})`)
        continue
      }

      const url = URL.createObjectURL(file)
      next.push({ file, url })
      if (isImage) currentImages += 1
      if (isVideo) currentVideos += 1
    }

    setMediaItems(next)
    if (skipped.length > 0) {
      setMediaError(`Some files were not added: ${skipped.join(' • ')}`)
    }

    // reset so same file can be re-selected
    e.target.value = ''
  }

  function removeMediaItem(index) {
    setMediaItems((prev) => {
      const item = prev[index]
      if (item?.url) {
        try { URL.revokeObjectURL(item.url) } catch (e) {}
      }
      return prev.filter((_, i) => i !== index)
    })
  }


  

  function handleSaveDraft() {
    setStatusMessage('Saved as a local draft. You can come back to this text later.')
  }

  if (!session) {
    return null
  }

  return (
    <div className="card card-soft">
      <h2 className="page-title">
        A story for {session.forWhom || 'this person'}
      </h2>
      <p className="page-subtitle">
        Before anything is added to the MemoryTree, you can fully reshape or remove it.
        The AI is just a constrained writing assistant.
      </p>

      <div style={{ marginTop: '1rem' }} className="editor-layout">
        <section aria-label="Prompt and AI draft">
          <div className="editor-pane-title">Prompt card(s) and topic for this story</div>
          <div className="editor-pane-sub">
            {session.selectedPrompts?.length ? (
              <ul>
                {session.selectedPrompts.map((id) => (
                  <li key={id}>Prompt card: {id}</li>
                ))}
              </ul>
            ) : (
              <div>No fixed prompt card was chosen; only a custom topic is used.</div>
            )}
            {session.customPrompt && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
                <strong>Custom topic:</strong> {session.customPrompt}
              </div>
            )}
          </div>

          {!session.skipAI && (
            <div>
              <div className="editor-pane-title" style={{ marginTop: '0.6rem' }}>
                AI draft (v{aiVersion})
              </div>
              <div className="ai-draft-meta">
                <span>
                  Tone: {session.tone} • length: {session.length}
                </span>
                <span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleRegenerate}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (aiVersion === 1 ? 'Generating…' : 'Regenerating…') : (aiVersion === 1 ? 'Generate' : 'Regenerate')}
                  </button>
                </span>
              </div>
              <div className="ai-draft-box" aria-live="polite">
                {session.skipAI ? 'This session was set to skip AI drafts.' : aiDraft}
              </div>
            </div>
          )}
        </section>

        <section aria-label="Co-editing area">
          <div className="editor-pane-title">Shape the story into something that feels right</div>
          <div className="editor-pane-sub">
            This space belongs to you (and your companion, if someone is with you).
            You can treat the AI draft purely as a starting point, or delete it and write from scratch.
          </div>

          <textarea
            className="editor-textarea"
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            placeholder="If you chose not to use an AI draft, you can start writing here."
          />

          {/* leaf name */}
          <div style={{ marginTop: '0.6rem' }}>
            <label className="field-label" htmlFor="leaf-name">
              Leaf name (shown on the tree)
            </label>
            <input
              id="leaf-name"
              className="input"
              type="text"
              placeholder="Give this leaf a short name (e.g., 'Mum looked after me')"
              value={leafName}
              onChange={(e) => setLeafName(e.target.value)}
              maxLength={60}
              style={{ maxWidth: '520px' }}
            />
            <div className="field-hint">
              Keep it short — this helps the tree stay readable on small screens.
            </div>
          </div>

          {/* rough year */}
          <div style={{ marginTop: '0.6rem' }}>
            <label className="field-label" htmlFor="memory-year">
              Rough year of this memory (optional)
            </label>
            <input
              id="memory-year"
              className="input"
              type="number"
              min="1900"
              max="2100"
              placeholder="For example: 2018"
              value={memoryYear}
              onChange={(e) => setMemoryYear(e.target.value)}
              style={{ maxWidth: '200px' }}
            />
            <div className="field-hint">
              This does not have to be exact. You can just give a rough year or leave it blank.
            </div>
          </div>

          {/* media attachment */}
          <div style={{ marginTop: '0.6rem' }}>
            <label className="field-label" htmlFor="leaf-media">
              Add an image or video to this leaf (optional)
            </label>
            <input
              id="leaf-media"
              className="input"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              style={{ maxWidth: '520px' }}
            />
            {mediaError && <div className="status-warning" style={{ marginTop: '0.4rem' }}>{mediaError}</div>}
            {mediaItems.length > 0 && (
              <div style={{ marginTop: '0.6rem' }}>
                <div className="field-hint" style={{ marginBottom: '0.4rem' }}>
                  Added: {mediaItems.filter((it) => it.file?.type?.startsWith('image/')).length} images, {mediaItems.filter((it) => it.file?.type?.startsWith('video/')).length} videos
                  (limits: 10 images, 2 videos)
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {mediaItems.map((item, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.5rem' }}>
                      {item.file && item.file.type && item.file.type.startsWith('video/') ? (
                        <video src={item.url} controls style={{ width: '100%', maxWidth: '520px', borderRadius: '10px' }} />
                      ) : (
                        <img src={item.url} alt="Selected attachment preview" style={{ width: '100%', maxWidth: '520px', borderRadius: '10px' }} />
                      )}
                      <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="field-hint" style={{ margin: 0 }}>
                          {item.file?.name || 'Attachment'}
                        </div>
                        <button type="button" className="btn btn-ghost" onClick={() => removeMediaItem(idx)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="field-hint">
              Attachments are stored locally in this browser only. They are not sent to the AI or uploaded anywhere.
            </div>
          </div>

          <div className="editor-status-bar">
            <span>
              Tone: {session.tone} • length preset: {session.length}
              {markedInappropriateCount > 0 && ` • marked inappropriate ${markedInappropriateCount} time(s)`}
            </span>
            <span>Characters: {editorText.length}</span>
          </div>

          <ConfirmGate
            agreedContent={agreedContent}
            agreedControl={agreedControl}
            onChange={handleConfirmChange}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            disabled={aiLoading}
          />

          {statusMessage && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#6b645b' }}>
              {statusMessage}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default EditorPage