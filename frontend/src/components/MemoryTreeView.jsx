import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function safeYearFrom(m) {
  if (!m) return null
  if (typeof m.year === 'number') return m.year
  if (m.year && !Number.isNaN(Number(m.year))) return Number(m.year)
  if (m.createdAt) {
    const d = new Date(m.createdAt)
    if (!Number.isNaN(d.getTime())) return d.getFullYear()
  }
  return null
}

// life-phase grouping
function getLifePhase(year) {
  if (year == null) return 'unknown'
  if (year <= 2006) return 'childhood'
  if (year <= 2012) return 'early-teens'
  if (year <= 2018) return 'teens'
  if (year <= 2023) return 'early-adult'
  return 'recent'
}

// branch attachment points (0=top, 1=bottom)
const PHASE_ANCHOR_Y = {
  childhood: 0.82,
  'early-teens': 0.68,
  teens: 0.52,
  'early-adult': 0.34,
  recent: 0.18,
  unknown: 0.46,
}

// year range per phase; fixes leaf positions
const PHASE_YEAR_RANGE = {
  childhood:    [1950, 2006],
  'early-teens':[2006, 2012],
  teens:        [2012, 2018],
  'early-adult':[2018, 2023],
  recent:       [2023, 2030],
  unknown:      null,
}

// root-to-top order
const PHASE_ORDER = ['childhood', 'early-teens', 'teens', 'early-adult', 'recent', 'unknown']

// fullscreen helpers
function requestFs(el) {
  if (!el) return
  const anyEl = el
  if (anyEl.requestFullscreen) return anyEl.requestFullscreen()
  if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen()
}

function exitFs() {
  const d = document
  if (d.exitFullscreen) return d.exitFullscreen()
  if (d.webkitExitFullscreen) return d.webkitExitFullscreen()
}

function isNowFullscreen(el) {
  const d = document
  const fsEl = d.fullscreenElement || d.webkitFullscreenElement
  return !!fsEl && (!el || fsEl === el)
}

// onSelect: single click, onOpen: double click
function MemoryTreeView({ memories, onSelect, onOpen }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const navigate = useNavigate()

  // click/dblclick separation
  const clickTimerRef = useRef(null)

  const safeMemories = Array.isArray(memories) ? memories : []

  // measure container size
  useEffect(() => {
    function measure() {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setSize({ w: rect.width, h: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 80)
    return () => {
      window.removeEventListener('resize', measure)
      clearTimeout(t)
    }
  }, [])

  // track fullscreen state changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(isNowFullscreen(containerRef.current))
      // size changes in fullscreen, measure again
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setSize({ w: rect.width, h: rect.height })
    }
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (isNowFullscreen(el)) {
      exitFs()
    } else {
      requestFs(el)
    }
  }, [])

  // single click handler
  const handleLeafClick = useCallback(
    (id) => {
      if (clickTimerRef.current) return
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        onSelect?.(id)
      }, 220)
    },
    [onSelect]
  )

  const handleLeafDoubleClick = useCallback(
    (id) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      // fallback to select
      if (onOpen) onOpen(id)
      else onSelect?.(id)
    },
    [onOpen, onSelect]
  )

  // build tree layout: branches + leaves
  const layout = useMemo(() => {
    const result = {
      branches: [],
      leaves: [],
    }

    if (safeMemories.length === 0) return result

    // enrich & sort by year
    const enriched = safeMemories
      .map((m) => ({ ...m, sortYear: safeYearFrom(m) }))
      .sort((a, b) => {
        if (a.sortYear == null && b.sortYear == null) return 0
        if (a.sortYear == null) return 1
        if (b.sortYear == null) return -1
        return a.sortYear - b.sortYear
      })

    // group by phase
    const grouped = new Map()
    for (const m of enriched) {
      const phase = getLifePhase(m.sortYear)
      if (!grouped.has(phase)) grouped.set(phase, [])
      grouped.get(phase).push(m)
    }

    // branches, alternating L/R
    const branches = []
    let sideToggle = 0
    for (const phase of PHASE_ORDER) {
      if (!grouped.has(phase)) continue
      const items = grouped.get(phase)
      const anchorYRatio = PHASE_ANCHOR_Y[phase] ?? 0.5
      const side = sideToggle % 2 === 0 ? 'left' : 'right'
      sideToggle += 1
      branches.push({
        key: phase,
        phase,
        items,
        side,
        anchorYRatio,
      })
    }

    // leaf positions (in percentagea; same-year memories grouped)
    const leaves = []
    for (const br of branches) {
      const items = [...br.items].sort((a, b) => (a.sortYear ?? 0) - (b.sortYear ?? 0))

      // group by year
      const byYear = new Map()
      for (const m of items) {
        const yearKey = m.sortYear != null ? String(m.sortYear) : '—'
        if (!byYear.has(yearKey)) byYear.set(yearKey, [])
        byYear.get(yearKey).push(m)
      }
      const yearGroups = [...byYear.entries()].sort(([a], [b]) => {
        if (a === '—') return 1
        if (b === '—') return -1
        return Number(a) - Number(b)
      })
      const count = yearGroups.length
      for (let i = 0; i < count; i++) {
        const [yearKey, groupItems] = yearGroups[i]
        const m = groupItems[0]
        const tone = (m.tone || '').toLowerCase()
        const toneClass =
          tone === 'warm' ? 'tree-node-1' : tone === 'light' ? 'tree-node-2' : 'tree-node-3'

        // branch spread t∈[0,1]
        const t = count === 1 ? 0.55 : i / (count - 1)

        const yRatio = clamp(br.anchorYRatio - 0.10 + (1 - t) * 0.12, 0.08, 0.92)

        // horizontal offset
        const base = br.side === 'left' ? 36 : 64
        const spread = br.side === 'left' ? -10 : 10
        const stack = (i % 3) * (br.side === 'left' ? -3 : 3)

        const xPct = clamp(base + spread * (0.6 + t * 0.7) + stack, 12, 88)
        const yPct = clamp(yRatio * 100, 8, 92)

        leaves.push({
          id: `${br.key}__${yearKey}`,
          branchKey: br.key,
          yearKey,
          label: yearKey !== '—' ? yearKey : 'Unknown',
          year: m.sortYear,
          toneClass,
          xPct,
          yPct,
          items: groupItems,
        })
      }
    }

    result.branches = branches
    result.leaves = leaves
    return result
  }, [safeMemories])

  // empty state
  if (safeMemories.length === 0) {
    return (
      <div ref={containerRef} className="tree-canvas" aria-label="MemoryTree">
        <div className="tree-empty">
          No memories yet. Once you add a story, it will appear here as a new leaf.
        </div>
      </div>
    )
  }

  // SVG geometry
  const w = size.w || 1
  const h = size.h || 1

  const trunkTop = h * 0.12
  const trunkBottom = h * 0.92
  const trunkX = w * 0.5

  // trunk path
  const trunkPath = `
    M ${trunkX} ${trunkBottom}
    C ${trunkX - w * 0.03} ${h * 0.65},
      ${trunkX + w * 0.02} ${h * 0.35},
      ${trunkX} ${trunkTop}
  `

  // canopy ellipse
  const canopyCx = trunkX
  const canopyCy = h * 0.38
  const canopyRx = w * 0.44
  const canopyRy = h * 0.38

  // branch endpoints & control points
  const branchDrawData = layout.branches.map((br, idx) => {
    const y = h * br.anchorYRatio
    const dir = br.side === 'left' ? -1 : 1

    const len = 130

    const xEnd = trunkX + dir * len
    const yEnd = y - 30

    const cx = trunkX + dir * (len * 0.35)
    const cy = y - clamp(25, 20, 40)

    return {
      key: br.key,
      phase: br.phase,
      side: br.side,
      attach: { x: trunkX, y },
      end: { x: xEnd, y: yEnd },
      ctrl: { x: cx, y: cy },
      labelPos: { x: trunkX + dir * (len * 0.45), y: y - 14 },
      idx,
    }
  })

  const endByBranchKey = new Map(branchDrawData.map((b) => [b.key, b.end]))

  return (
    <div
      ref={containerRef}
      className={`tree-canvas ${isFullscreen ? 'tree-canvas-full' : ''}`}
      aria-label="MemoryTree"
    >
      {/* fullscreen toggle */}
      <button
        type="button"
        className="tree-fs-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? '⤡' : '⤢'}
      </button>

      {/* SVG layer */}
      <svg className="tree-svg" width="100%" height="100%" aria-hidden="true">
        {/* gradients */}
        <defs>
          {/* trunk gradient */}
          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="50%" stopColor="#8D6E63" />
            <stop offset="100%" stopColor="#5D4037" />
          </linearGradient>

          {/* canopy gradient */}
          <radialGradient id="canopyGradient" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#81C784" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#4CAF50" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.15" />
          </radialGradient>

          {/* branch gradient */}
          <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6D4C41" />
            <stop offset="100%" stopColor="#8D6E63" />
          </linearGradient>
        </defs>

        {/* canopy */}
        <ellipse
          cx={canopyCx}
          cy={canopyCy}
          rx={canopyRx}
          ry={canopyRy}
          fill="url(#canopyGradient)"
          className="tree-canopy"
        />

        {/* trunk */}
        <path d={trunkPath} className="tree-trunk" />

        {/* bark lines */}
        {[0.35, 0.50, 0.65, 0.78].map((t, i) => (
          <path
            key={`bark-${i}`}
            d={`M ${trunkX - 5} ${h * t} Q ${trunkX} ${h * (t + 0.03)} ${trunkX + 5} ${h * t}`}
            className="tree-bark-line"
          />
        ))}

        {/* roots */}
        <path
          d={`
            M ${trunkX - 20} ${trunkBottom}
            C ${trunkX - 35} ${trunkBottom - 15}, ${trunkX - 55} ${trunkBottom - 8}, ${trunkX - 70} ${trunkBottom - 4}
          `}
          className="tree-root"
        />
        <path
          d={`
            M ${trunkX + 20} ${trunkBottom}
            C ${trunkX + 35} ${trunkBottom - 15}, ${trunkX + 55} ${trunkBottom - 8}, ${trunkX + 70} ${trunkBottom - 4}
          `}
          className="tree-root"
        />
        {/* small roots */}
        <path
          d={`
            M ${trunkX - 12} ${trunkBottom}
            C ${trunkX - 22} ${trunkBottom - 10}, ${trunkX - 35} ${trunkBottom - 5}, ${trunkX - 45} ${trunkBottom - 2}
          `}
          className="tree-root-small"
        />
        <path
          d={`
            M ${trunkX + 12} ${trunkBottom}
            C ${trunkX + 22} ${trunkBottom - 10}, ${trunkX + 35} ${trunkBottom - 5}, ${trunkX + 45} ${trunkBottom - 2}
          `}
          className="tree-root-small"
        />

        {/* branches */}
        {branchDrawData.map((b) => (
          <path
            key={`br-${b.key}`}
            d={`M ${b.attach.x} ${b.attach.y} Q ${b.ctrl.x} ${b.ctrl.y} ${b.end.x} ${b.end.y}`}
            className="tree-branch-main"
          />
        ))}

        {/* twigs */}
        {layout.leaves.map((leaf) => {
          const end = endByBranchKey.get(leaf.branchKey)
          if (!end) return null
          const xLeaf = (leaf.xPct / 100) * w
          const yLeaf = (leaf.yPct / 100) * h

          const dir = xLeaf < trunkX ? -1 : 1
          const cx = end.x + dir * Math.min(40, Math.abs(xLeaf - end.x) * 0.4)
          const cy = yLeaf - Math.min(30, Math.abs(yLeaf - end.y) * 0.2)

          return (
            <path
              key={`tw-${leaf.id}`}
              d={`M ${end.x} ${end.y} Q ${cx} ${cy} ${xLeaf} ${yLeaf}`}
              className="tree-twig"
            />
          )
        })}
      </svg>

      {/* leaf nodes */}
      {layout.leaves.map((leaf) => {
        const isGroup = leaf.items.length > 1

        if (isGroup) {
          // grouped leaf: opens year list page
          return (
            <button
              key={leaf.id}
              type="button"
              className={`tree-node ${leaf.toneClass} tree-node-group`}
              style={{ top: `${leaf.yPct}%`, left: `${leaf.xPct}%` }}
              onClick={() => navigate(`/tree/year/${leaf.yearKey}`)}
              title={`${leaf.items.length} memories in ${leaf.yearKey} — click to view all`}
            >
              {leaf.yearKey === '—' ? 'Unknown year' : `${leaf.yearKey} memories`}
              <span className="tree-node-badge">{leaf.items.length}</span>
            </button>
          )
        }

        // single leaf
        const m = leaf.items[0]
        const yearLabel = leaf.year ? ` • ${leaf.year}` : ''
        return (
          <button
            key={leaf.id}
            type="button"
            className={`tree-node ${leaf.toneClass}`}
            style={{ top: `${leaf.yPct}%`, left: `${leaf.xPct}%` }}
            onClick={() => handleLeafClick(m.id)}
            onDoubleClick={() => handleLeafDoubleClick(m.id)}
            title="Single click: preview • Double click: open"
          >
            {m.title || 'Untitled memory'}
            {yearLabel}
          </button>
        )
      })}
    </div>
  )
}

export default MemoryTreeView
