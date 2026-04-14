import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMemory, deleteMemory, updateMemory } from '../fakeApi.js'
import { getMediaObjectUrl, saveMediaFile, deleteMedia } from '../mediaStore.js'

function MemoryDetailPage() {
  const { memoryId } = useParams()
  const navigate = useNavigate()
  const [memory, setMemory] = useState(null)
  const [status, setStatus] = useState('')

  // edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [draftYear, setDraftYear] = useState('')

  // view-mode media URLs
  const [mediaUrls, setMediaUrls] = useState([])

  // edit-mode media state
  const [draftMedia, setDraftMedia] = useState([]) // existing metadata
  const [removedMediaIds, setRemovedMediaIds] = useState([]) // pending deletes
  const [newMediaItems, setNewMediaItems] = useState([])
  const [mediaEditError, setMediaEditError] = useState('')

  useEffect(() => {
    return () => {
      for (const m of mediaUrls) {
        if (m?.url) {
          try { URL.revokeObjectURL(m.url) } catch (e) {}
        }
      }
    }
  }, [mediaUrls])

  useEffect(() => {
    return () => {
      for (const item of newMediaItems) {
        if (item?.url) {
          try { URL.revokeObjectURL(item.url) } catch (e) {}
        }
      }
    }
  }, [newMediaItems])

useEffect(() => {
    const m = getMemory(memoryId)
    if (!m) {
      navigate('/tree')
      return
    }
    setMemory(m)

    // init edit fields
    setDraftTitle(m.title || '')
    setDraftText(m.text || '')
    setDraftYear(m.year ?? '')

    // reset media edit state
    setMediaEditError('')
    setRemovedMediaIds([])
    setNewMediaItems((prev) => {
      for (const item of prev) {
        if (item?.url) {
          try { URL.revokeObjectURL(item.url) } catch (e) {}
        }
      }
      return []
    })
  }, [memoryId, navigate])
  useEffect(() => {
    let cancelled = false

    async function load() {
      const list = Array.isArray(memory?.media) ? memory.media : []
      const results = []
      for (const m of list) {
        try {
          const url = await getMediaObjectUrl(m.id)
          if (url) results.push({ ...m, url })
        } catch (err) {
          console.error(err)
        }
      }
      if (!cancelled) setMediaUrls(results)
    }

    setMediaUrls([])
    if (memory) load()

    return () => {
      cancelled = true
    }
  }, [memory])



  if (!memory) return null

  function handleExport() {
    const lines = [
      `Title: ${memory.title || 'Untitled memory'}`,
      `For: ${memory.forWhom || ''}`,
      `Created at: ${new Date(memory.createdAt).toLocaleString()}`,
      memory.year ? `Rough year of memory: ${memory.year}` : '',
      `Tone: ${memory.tone || ''}`,
      '',
      memory.text || ''
    ].filter(Boolean)

    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${memory.title || 'memory'}-${memory.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Exported as a local text file. Please consider where you store this file and who can see it.')
  }

  function handleDelete() {
    const sure = window.confirm(
      'Deleting this memory will only remove it from this MemoryTree. It does not change how you feel about the experience itself. Do you want to continue?'
    )
    if (!sure) return
    if (Array.isArray(memory.media)) {
      for (const m of memory.media) {
        if (m && m.id) deleteMedia(m.id).catch((err) => console.error(err))
      }
    }
    deleteMemory(memory.id)
    setStatus('This memory has been removed from the tree.')
    navigate('/tree')
  }

  function startEditing() {
    setIsEditing(true)
    setStatus('')
    setMediaEditError('')

    setDraftTitle(memory?.title || '')
    setDraftText(memory?.text || '')
    setDraftYear(memory?.year ?? '')

    // init media edit state
    setDraftMedia(Array.isArray(memory?.media) ? memory.media : [])
    setRemovedMediaIds([])

    setNewMediaItems((prev) => {
      for (const item of prev) {
        if (item?.url) {
          try { URL.revokeObjectURL(item.url) } catch (e) {}
        }
      }
      return []
    })
  }

  function cancelEditing() {
    setIsEditing(false)
    setStatus('')
    setMediaEditError('')
    setDraftMedia([])
    setRemovedMediaIds([])
    setNewMediaItems((prev) => {
      for (const item of prev) {
        if (item?.url) {
          try { URL.revokeObjectURL(item.url) } catch (e) {}
        }
      }
      return []
    })
  }


  function handleNewMediaChange(e) {
    setMediaEditError('')
    const files = Array.from((e.target.files && e.target.files.length) ? e.target.files : [])
    if (files.length === 0) return

    const MAX_BYTES = 100 * 1024 * 1024 // 100 MB
    const MAX_IMAGES = 10
    const MAX_VIDEOS = 2

    let currentImages =
      (draftMedia || []).filter((m) => m.type && m.type.startsWith('image/')).length +
      newMediaItems.filter((it) => it.file?.type?.startsWith('image/')).length
    let currentVideos =
      (draftMedia || []).filter((m) => m.type && m.type.startsWith('video/')).length +
      newMediaItems.filter((it) => it.file?.type?.startsWith('video/')).length

    const next = [...newMediaItems]
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

    setNewMediaItems(next)
    if (skipped.length > 0) {
      setMediaEditError(`Some files were not added: ${skipped.join(' • ')}`)
    }

    e.target.value = ''
  }

  function removeExistingAttachment(id) {
    setDraftMedia((prev) => (prev || []).filter((m) => m.id !== id))
    setRemovedMediaIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function removeNewAttachment(index) {
    setNewMediaItems((prev) => {
      const item = prev[index]
      if (item?.url) {
        try { URL.revokeObjectURL(item.url) } catch (e) {}
      }
      return prev.filter((_, i) => i !== index)
    })
  }


  async function saveEdits() {
    const title = (draftTitle || '').trim() || 'Untitled memory'
    const text = (draftText || '').trim()

    if (!text) {
      setStatus('Please write some text before saving. (You can also delete the memory if you no longer want it.)')
      return
    }

    let yearValue = null
    if (draftYear !== '' && draftYear !== null && String(draftYear).trim() !== '') {
      const parsed = parseInt(String(draftYear).trim(), 10)
      if (!Number.isNaN(parsed)) yearValue = parsed
    }

    // enforce media limits
    const MAX_IMAGES = 10
    const MAX_VIDEOS = 2

    const baseMedia = Array.isArray(draftMedia) ? draftMedia : []
    const existingImages = baseMedia.filter((m) => m.type && m.type.startsWith('image/')).length
    const existingVideos = baseMedia.filter((m) => m.type && m.type.startsWith('video/')).length
    const newImages = newMediaItems.filter((it) => it.file?.type?.startsWith('image/')).length
    const newVideos = newMediaItems.filter((it) => it.file?.type?.startsWith('video/')).length

    if (existingImages + newImages > MAX_IMAGES || existingVideos + newVideos > MAX_VIDEOS) {
      setStatus(`Attachment limits exceeded. Max ${MAX_IMAGES} images and ${MAX_VIDEOS} videos per leaf.`)
      return
    }

    let newMetaList = []
    if (newMediaItems.length > 0) {
      try {
        for (const item of newMediaItems) {
          const saved = await saveMediaFile(item.file)
          newMetaList.push(saved)
        }
      } catch (err) {
        console.error(err)
        setStatus('Could not save one of the new attachments locally. Please try again or continue without them.')
        return
      }
    }

    // delete removed attachments
    if (removedMediaIds.length > 0) {
      for (const id of removedMediaIds) {
        try { await deleteMedia(id) } catch (err) { console.error(err) }
      }
    }

    const nextMedia = [...baseMedia, ...newMetaList]
const updated = updateMemory(memory.id, {
      title,
      text,
      year: yearValue,
      media: nextMedia
    })

    if (!updated) {
      setStatus('Could not save changes. Please try again.')
      return
    }

    setMemory(updated)
    setIsEditing(false)
    setStatus('Changes saved. This leaf has been updated in your MemoryTree.')
  }

  return (
    <div className="card card-soft">
      {!isEditing ? (
        <>
          <h2 className="page-title">{memory.title || 'Untitled memory'}</h2>
          <p className="page-subtitle">
            A story for {memory.forWhom || 'this person'} •{' '}
            {new Date(memory.createdAt).toLocaleString()} • tone: {memory.tone || '—'}
            {memory.year && ` • roughly around: ${memory.year}`}
          </p>

          <section style={{ marginTop: '1rem' }} aria-label="Media attachments">
            {mediaUrls && mediaUrls.length > 0 ? (
              <div>
                <div className="field-hint" style={{ marginBottom: '0.4rem' }}>
                  Attachments: {mediaUrls.filter((m) => m.type?.startsWith('image/')).length} images, {mediaUrls.filter((m) => m.type?.startsWith('video/')).length} videos
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {mediaUrls.map((m) => (
                    <div key={m.id} style={{ borderRadius: '10px', overflow: 'hidden' }}>
                      {m.type && m.type.startsWith('video/') ? (
                        <video src={m.url} controls style={{ width: '100%', maxWidth: '720px', borderRadius: '10px' }} />
                      ) : (
                        <img src={m.url} alt={m.name ? `Attachment: ${m.name}` : 'Leaf attachment'} style={{ width: '100%', maxWidth: '720px', borderRadius: '10px' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <></>
            )}
          </section>

          <section style={{ marginTop: '1rem' }} aria-label="Memory text">
            <div
              style={{
                borderRadius: '0.9rem',
                border: '1px solid var(--border-subtle)',
                padding: '0.9rem 1rem',
                background: 'rgba(255,255,255,0.9)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontSize: '0.96rem'
              }}
            >
              {memory.text}
            </div>
          </section>

          <section style={{ marginTop: '0.9rem' }} aria-label="Actions">
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={handleExport}>
                Export this memory
              </button>
              <button type="button" className="btn btn-primary" onClick={startEditing}>
                Edit leaf details
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Remove from MemoryTree
              </button>
            </div>
            {status && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#6b645b' }}>
                {status}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <h2 className="page-title">Edit this leaf</h2>
          <p className="page-subtitle">
            You remain in control. You can update the leaf name, the story text, and the approximate year.
          </p>

          <section style={{ marginTop: '1rem' }} aria-label="Edit fields">
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div>
                <label className="field-label" htmlFor="edit-title">
                  Leaf name (shown on the tree)
                </label>
                <input
                  id="edit-title"
                  className="input"
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  maxLength={60}
                  placeholder="Give this leaf a short name"
                  style={{ maxWidth: '520px' }}
                />
                <div className="field-hint">Keep it short — this helps the tree stay readable.</div>
              </div>

              <div>
                <label className="field-label" htmlFor="edit-year">
                  Rough year of this memory (optional)
                </label>
                <input
                  id="edit-year"
                  className="input"
                  type="number"
                  min="1900"
                  max="2100"
                  value={draftYear}
                  onChange={(e) => setDraftYear(e.target.value)}
                  placeholder="For example: 2018"
                  style={{ maxWidth: '200px' }}
                />
                <div className="field-hint">This does not have to be exact.</div>
              </div>

              <div>
                <label className="field-label" htmlFor="edit-text">
                  Story text
                </label>
                <textarea
                  id="edit-text"
                  className="editor-textarea"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Edit the story here"
                  style={{ minHeight: '240px' }}
                />
                <div className="field-hint">Characters: {draftText.length}</div>
              </div>
            </div>
          </section>

          <section style={{ marginTop: '0.9rem' }} aria-label="Edit attachments">
            <div className="field-label">Attachments (optional)</div>
            <div className="field-hint">
              You can add up to 10 images and 2 videos to a single leaf. Attachments are stored locally in this browser only.
            </div>

            {draftMedia && draftMedia.length > 0 && (
              <div style={{ marginTop: '0.6rem' }}>
                <div className="field-label">Current attachments</div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {draftMedia.map((m) => (
                    <div key={m.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.5rem' }}>
                      <div className="field-hint" style={{ margin: 0 }}>{m.name || 'Attachment'}</div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeExistingAttachment(m.id)}
                        style={{ marginTop: '0.4rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '0.8rem' }}>
              <label className="field-label" htmlFor="edit-leaf-media">
                Add more images/videos
              </label>
              <input
                id="edit-leaf-media"
                className="input"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleNewMediaChange}
                style={{ maxWidth: '520px' }}
              />
              {mediaEditError && <div className="status-warning" style={{ marginTop: '0.4rem' }}>{mediaEditError}</div>}
            </div>

            {newMediaItems.length > 0 && (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="field-label">New attachments (not saved yet)</div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {newMediaItems.map((item, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.5rem' }}>
                      {item.file && item.file.type && item.file.type.startsWith('video/') ? (
                        <video src={item.url} controls style={{ width: '100%', maxWidth: '520px', borderRadius: '10px' }} />
                      ) : (
                        <img src={item.url} alt="New attachment preview" style={{ width: '100%', maxWidth: '520px', borderRadius: '10px' }} />
                      )}
                      <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="field-hint" style={{ margin: 0 }}>{item.file?.name || 'Attachment'}</div>
                        <button type="button" className="btn btn-ghost" onClick={() => removeNewAttachment(idx)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section style={{ marginTop: '0.9rem' }} aria-label="Save changes">
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={saveEdits}>
                Save changes
              </button>
              <button type="button" className="btn btn-secondary" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
            {status && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#6b645b' }}>
                {status}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default MemoryDetailPage
