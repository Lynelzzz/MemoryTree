import React, { useState, useRef, useMemo } from 'react'
import { exportAllMemories, deleteAllData } from '../fakeApi.js'
import { clearAllMedia, getMediaBlob } from '../mediaStore.js'
import MemoryTreeView from '../components/MemoryTreeView.jsx'

// sanitize filename
function sanitizeName(name) {
  return (name || 'untitled')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 60)
    .trim() || 'memory'
}

function buildMemoryText(m) {
  return [
    `Title:    ${m.title || ''}`,
    `For:      ${m.forWhom || ''}`,
    `Year:     ${m.year ?? ''}`,
    `Tone:     ${m.tone || ''}`,
    `Created:  ${new Date(m.createdAt).toLocaleString()}`,
    '',
    m.text || '',
  ].join('\n')
}

function SettingsPage() {
  const [status, setStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const hiddenTreeRef = useRef(null)

  // stable memories for hidden tree
  const allMemories = useMemo(() => exportAllMemories(), [])

  async function handleExportZip() {
    setIsExporting(true)
    setStatus('Preparing export…')

    try {
      const memories = exportAllMemories()

      // dynamic imports
      const [{ default: JSZip }, { default: html2canvas }] = await Promise.all([
        import('jszip'),
        import('html2canvas'),
      ])

      const zip = new JSZip()

      // 1. tree screenshot
      await new Promise((r) => setTimeout(r, 400))
      if (hiddenTreeRef.current) {
        try {
          const canvas = await html2canvas(hiddenTreeRef.current, {
            backgroundColor: '#fdf9f4',
            scale: 1.5,
            useCORS: true,
            logging: false,
          })
          const pngBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
          if (pngBlob) zip.file('memorytree-visualization.png', pngBlob)
        } catch (err) {
          console.warn('Tree screenshot failed, skipping:', err)
        }
      }

      // 2. one folder per memory
      for (const m of memories) {
        const folderName = `${sanitizeName(m.title || m.id)}_${m.id.slice(0, 6)}`
        const folder = zip.folder(folderName)

        folder.file('memory.txt', buildMemoryText(m))

        // media attachments
        for (const mediaMeta of (m.media || [])) {
          try {
            const result = await getMediaBlob(mediaMeta.id)
            if (result?.blob) {
              folder.file(mediaMeta.name || `attachment_${mediaMeta.id}`, result.blob)
            }
          } catch (err) {
            console.warn('Could not include media file:', mediaMeta.id, err)
          }
        }
      }

      // 3. generate & download
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'memorytree-export.zip'
      a.click()
      URL.revokeObjectURL(url)

      setStatus(
        `Exported ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} as a ZIP file.`
      )
    } catch (err) {
      console.error(err)
      setStatus('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  function handleDeleteAll() {
    const sure1 = window.confirm('This will delete all MemoryTree data stored in this browser.')
    if (!sure1) return
    const sure2 = window.prompt('If you are sure, please type DELETE to continue.')
    if (sure2 !== 'DELETE') {
      setStatus('Data was not deleted. Only the exact word DELETE will confirm this action.')
      return
    }
    deleteAllData()
    clearAllMedia().catch((err) => console.error(err))
    setStatus('All data stored in this browser has been cleared. You can start again at any time.')
  }

  return (
    <div className="card card-soft">
      <h2 className="page-title">Settings & privacy</h2>
      <p className="page-subtitle">
        These tools help you stay in control of your data: exporting, deleting, and understanding the
        research context of this prototype.
      </p>

      <div className="settings-grid" style={{ marginTop: '1rem' }}>
        <section className="card card-soft">
          <div className="settings-card-title">Export data</div>
          <p className="settings-card-body">
            Export all your memories as a ZIP file. Each memory gets its own folder containing the
            story text and any attached media files. A visualisation screenshot of your MemoryTree
            is also included.
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportZip}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting…' : 'Export all memories'}
            </button>
          </div>
        </section>

        <section className="card card-soft">
          <div className="settings-card-title">Delete all data</div>
          <p className="settings-card-body">
            If you no longer want to keep this MemoryTree, you can clear all data stored in this browser.
            This will not affect already anonymised, aggregated research results, which cannot be traced back to you.
          </p>
          <div className="settings-actions">
            <span className="badge badge-danger">This action cannot be undone</span>
            <button type="button" className="btn btn-danger" onClick={handleDeleteAll}>
              Delete my MemoryTree
            </button>
          </div>
        </section>

        <section className="card card-soft">
          <div className="settings-card-title">About this prototype</div>
          <p className="settings-card-body">
            MemoryTree is a prototype built for a final-year dissertation project. Its aim is to explore
            how "controllable AI + human co-creation" might support memory work in sensitive contexts,
            while keeping a strong focus on emotional care and privacy.
          </p>
          <p className="settings-card-body">
            The interface, buttons, and flows are designed to support reflection on perceived control,
            comfort, and AI safety events in user studies.
          </p>
        </section>
      </div>

      {status && !status.startsWith('Exported') && (
        <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#6b645b' }}>
          {status}
        </div>
      )}

      {/* off-screen tree for screenshot */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1280px',
          height: '800px',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={hiddenTreeRef} style={{ width: '1280px', height: '800px' }}>
          <MemoryTreeView memories={allMemories} />
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
