import * as React from "react"
import type { Cell, ContributionStats } from "./GitHubActivity"

export type RoundTheYearProps = {
  /** Reuse the normalized cells and stats already produced by GitHubActivity. */
  cells: Cell[]
  weeks: number
  months?: { week: number; label: string }[]
  stats: ContributionStats
  /** Existing palette: empty cell followed by four activity colors. */
  colors: string[]
  className?: string
  duration?: number
  numberFontFamily?: string
  labelFontFamily?: string
}

type Tile = {
  cell: Cell
  week: number
  day: number
  angle: number
  r: number
  w: number
  h: number
  radius: number
  level: number
  startTime: number
  endTime: number
}

type RingDef = {
  r: number
  w: number
  h: number
  radius: number
}

const TAU = Math.PI * 2
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
  }
}

const formatDate = (dateStr: string) => {
  try {
    const parts = dateStr.split("-").map(Number)
    if (parts.length === 3) {
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export default function RoundTheYear({
  cells,
  weeks,
  months,
  stats,
  colors,
  className,
  duration = 6000,
  numberFontFamily = "Geist, sans-serif",
  labelFontFamily = "Manrope, sans-serif",
}: RoundTheYearProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const progressRef = React.useRef(0)
  const hoveredIdxRef = React.useRef(-1)

  const [size, setSize] = React.useState(450)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  const [displayStreak, setDisplayStreak] = React.useState(0)
  const [hoveredCell, setHoveredCell] = React.useState<{ cell: Cell; x: number; y: number } | null>(null)

  const palette = React.useMemo(() => ({
    levels: [
      colors[0] ?? "#161b22",
      colors[1] ?? "#0e4429",
      colors[2] ?? "#006d32",
      colors[3] ?? "#26a641",
      colors[4] ?? "#39d353",
    ],
    hand: colors[4] ?? "#39d353",
    accent: colors[4] ?? "#39d353",
  }), [colors])

  // Detect user motion preference
  React.useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener?.("change", update)
    return () => query.removeEventListener?.("change", update)
  }, [])

  // Responsive size observer
  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = (w: number) => {
      if (w <= 0) return
      const clamped = Math.floor(clamp(w, 280, 460))
      setSize((prev) => (Math.abs(prev - clamped) > 1 ? clamped : prev))
    }
    measure(host.clientWidth)
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect
          const w = cr ? cr.width : host.clientWidth
          measure(w)
        }
      })
      observer.observe(host)
      return () => observer.disconnect()
    }
    const onResize = () => measure(host.clientWidth)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Circular layout and deterministic BFS traversal timing with progressive tile sizing
  const model = React.useMemo(() => {
    const valid = cells.filter((cell) =>
      Number.isFinite(cell.week) && cell.week >= 0 &&
      Number.isFinite(cell.day) && cell.day >= 0 && cell.day < 7 &&
      typeof cell.date === "string" && cell.date.length >= 7
    )
    const weekCount = Math.max(weeks, valid.reduce((max, cell) => Math.max(max, cell.week + 1), 0), 53)
    const startAngle = -Math.PI / 2
    const step = TAU / weekCount

    // Dynamic scale relative to 450px reference canvas
    const scale = clamp(size / 450, 0.65, 1.15)
    const gap = 2.0 * scale
    const innerEdge = 88 * scale

    // Progressive radius-dependent sizing for each of the 7 concentric rings:
    // Outer rings have larger circumference, so tile width scales with arc length,
    // and radial height scales appropriately to keep cells naturally square/balanced
    // while maintaining a narrow, uniform gap between all cells.
    const ringDefs: RingDef[] = []
    let currentEdge = innerEdge

    for (let day = 0; day < 7; day++) {
      // Estimated radial height based on ring index
      let h = (8.3 + day * 1.55) * scale
      let r = currentEdge + h / 2
      let arc = r * step
      let w = arc - gap
      // Maintain consistent aspect ratio (~1.08:1 compact square)
      h = w * 0.92
      r = currentEdge + h / 2
      arc = r * step
      w = arc - gap
      const cornerRadius = Math.max(1.2 * scale, Math.min(w, h) * 0.18)

      ringDefs.push({ r, w, h, radius: cornerRadius })
      currentEdge = r + h / 2 + gap
    }

    const outerEdge = ringDefs[6].r + ringDefs[6].h / 2
    const labelRadius = outerEdge + 17 * scale

    // BFS Traversal: wave travels week-by-week, staggered across the 7 weekdays
    const alpha = 0.75 // intra-week cell stagger
    const maxScore = (weekCount - 1) + (6 / 7) * alpha
    const sweepDuration = 0.86 // wave wavefront arrives by 86% of total animation time
    const cellWindow = 0.14    // each individual cell blooms over 14% of total time

    const tiles: Tile[] = valid.map((cell) => {
      const ring = cell.day
      const ringDef = ringDefs[ring] ?? ringDefs[0]
      const angle = startAngle + (cell.week + 0.5) * step
      const score = (cell.week + (ring / 7) * alpha) / maxScore
      const startTime = sweepDuration * score
      const endTime = startTime + cellWindow

      return {
        cell,
        week: cell.week,
        day: ring,
        angle,
        r: ringDef.r,
        w: ringDef.w,
        h: ringDef.h,
        radius: ringDef.radius,
        level: clamp(Math.round(cell.level), 0, 4),
        startTime,
        endTime,
      }
    })

    // Month markers around perimeter in chronological order
    const markers: { label: string; angle: number; startTime: number }[] = []
    if (months && months.length > 0) {
      for (const m of months) {
        markers.push({
          label: m.label.toUpperCase(),
          angle: startAngle + (m.week + 0.5) * step,
          startTime: sweepDuration * (m.week / weekCount),
        })
      }
    } else {
      let prevMonth = -1
      for (let w = 0; w < weekCount; w++) {
        const cellInWeek = valid.find((item) => item.week === w)
        if (!cellInWeek) continue
        const m = Number(cellInWeek.date.slice(5, 7)) - 1
        if (m !== prevMonth && m >= 0 && m < 12) {
          prevMonth = m
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
          markers.push({
            label: monthNames[m],
            angle: startAngle + (w + 0.5) * step,
            startTime: sweepDuration * (w / weekCount),
          })
        }
      }
      if (markers.length > 1 && markers[1].angle - markers[0].angle < step * 2.5) {
        markers.shift()
      }
    }

    return {
      tiles,
      markers,
      ringDefs,
      weeks: weekCount,
      startAngle,
      step,
      cx: size / 2,
      cy: size / 2,
      innerEdge,
      outerEdge,
      labelRadius,
      sweepDuration,
    }
  }, [cells, weeks, months, size])

  // Canvas render routine
  const render = React.useCallback((u: number, hoveredIndex = -1) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pixelSize = Math.round(size * dpr)
    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = pixelSize
      canvas.height = pixelSize
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)

    const { cx, cy, tiles, markers, sweepDuration, startAngle } = model

    // 1. Draw progressively-sized rounded square/rectangle contribution tiles
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]

      let tileProgress = 1
      if (u < 1) {
        if (u <= tile.startTime) continue
        if (u >= tile.endTime) {
          tileProgress = 1
        } else {
          const k = (u - tile.startTime) / (tile.endTime - tile.startTime)
          tileProgress = 1 - Math.pow(1 - k, 3) // cubic ease-out
        }
      }

      const opacity = tileProgress
      const scale = 0.45 + 0.55 * tileProgress
      const isHovered = i === hoveredIndex

      const x = cx + Math.cos(tile.angle) * tile.r
      const y = cy + Math.sin(tile.angle) * tile.r

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(tile.angle)
      if (scale < 0.999) {
        ctx.scale(scale, scale)
      }
      ctx.globalAlpha = opacity

      ctx.beginPath()
      drawRoundedRect(ctx, -tile.w / 2, -tile.h / 2, tile.w, tile.h, tile.radius)
      ctx.fillStyle = palette.levels[tile.level] ?? palette.levels[0]
      ctx.fill()

      if (isHovered) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()
    }

    // 2. Draw Month Labels in high-contrast white
    ctx.font = `600 ${Math.max(9, Math.round(size * 0.024))}px ${labelFontFamily}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    for (const marker of markers) {
      let labelOpacity = 1
      if (u < 1) {
        if (u <= marker.startTime) continue
        if (u < marker.startTime + 0.08) {
          labelOpacity = clamp((u - marker.startTime) / 0.08, 0, 1)
        }
      }

      const lx = cx + Math.cos(marker.angle) * model.labelRadius
      const ly = cy + Math.sin(marker.angle) * model.labelRadius

      ctx.save()
      ctx.globalAlpha = labelOpacity
      ctx.fillStyle = "#ffffff"
      ctx.fillText(marker.label, lx, ly)
      ctx.restore()
    }

    // 3. Subtle radial hand (accompanies the BFS reveal without dominating)
    if (u < 0.92 && tiles.length > 0) {
      const handProgress = clamp(u / sweepDuration, 0, 1)
      const handAngle = startAngle + handProgress * TAU
      const fadeAlpha = u > 0.80 ? clamp((0.92 - u) / 0.12, 0, 1) : 1

      ctx.save()
      ctx.globalAlpha = fadeAlpha * 0.35
      ctx.strokeStyle = palette.hand
      ctx.lineWidth = 1.2
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(handAngle) * (model.innerEdge - 2), cy + Math.sin(handAngle) * (model.innerEdge - 2))
      ctx.lineTo(cx + Math.cos(handAngle) * (model.outerEdge + 3), cy + Math.sin(handAngle) * (model.outerEdge + 3))
      ctx.stroke()
      ctx.restore()
    }
  }, [size, model, palette, labelFontFamily])

  const renderRef = React.useRef(render)
  React.useEffect(() => {
    renderRef.current = render
  })

  // Redraw when size changes without restarting animation
  React.useEffect(() => {
    renderRef.current(progressRef.current, hoveredIdxRef.current)
  }, [size, model])

  // BFS build animation controller
  React.useEffect(() => {
    if (reducedMotion || duration <= 0) {
      progressRef.current = 1
      setDisplayStreak(stats.current.days)
      renderRef.current(1, -1)
      return
    }

    let rafId: number | null = null
    let start: number | null = null

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp
      const elapsed = timestamp - start
      const u = clamp(elapsed / duration, 0, 1)
      progressRef.current = u

      const targetStreak = Math.round(stats.current.days * clamp(u / 0.86, 0, 1))
      setDisplayStreak(targetStreak)

      renderRef.current(u, hoveredIdxRef.current)

      if (u < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        rafId = null
        setDisplayStreak(stats.current.days)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [reducedMotion, duration, stats.current.days])

  // Snap to finished if tab visibility changes
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && progressRef.current < 1) {
        progressRef.current = 1
        setDisplayStreak(stats.current.days)
        renderRef.current(1, -1)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [stats.current.days])

  // Interactive hover tooltip with rotated local bounding box hit testing
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || progressRef.current < 0.25) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top

    const { cx, cy, innerEdge, outerEdge, tiles } = model
    const dx = px - cx
    const dy = py - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < innerEdge - 8 || dist > outerEdge + 8) {
      if (hoveredIdxRef.current !== -1) {
        hoveredIdxRef.current = -1
        setHoveredCell(null)
        renderRef.current(progressRef.current, -1)
      }
      return
    }

    let bestIdx = -1

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]
      if (progressRef.current < 1 && progressRef.current < tile.startTime) continue
      const tx = cx + Math.cos(tile.angle) * tile.r
      const ty = cy + Math.sin(tile.angle) * tile.r

      const ox = px - tx
      const oy = py - ty
      const cosA = Math.cos(-tile.angle)
      const sinA = Math.sin(-tile.angle)
      const localX = ox * cosA - oy * sinA
      const localY = ox * sinA + oy * cosA

      if (Math.abs(localX) <= tile.w / 2 + 1 && Math.abs(localY) <= tile.h / 2 + 1) {
        bestIdx = i
        break
      }
    }

    if (bestIdx !== hoveredIdxRef.current) {
      hoveredIdxRef.current = bestIdx
      if (bestIdx >= 0) {
        const t = tiles[bestIdx]
        setHoveredCell({
          cell: t.cell,
          x: cx + Math.cos(t.angle) * t.r,
          y: cy + Math.sin(t.angle) * t.r,
        })
      } else {
        setHoveredCell(null)
      }
      renderRef.current(progressRef.current, bestIdx)
    }
  }

  const handlePointerLeave = () => {
    if (hoveredIdxRef.current !== -1) {
      hoveredIdxRef.current = -1
      setHoveredCell(null)
      renderRef.current(progressRef.current, -1)
    }
  }

  return (
    <div
      className={`w-full flex items-center justify-center py-2 sm:py-3 ${className ?? ""}`}
      style={{ minHeight: "fit-content" }}
    >
      <div
        ref={hostRef}
        className="relative mx-auto flex items-center justify-center"
        style={{
          width: "100%",
          maxWidth: "min(100%, 460px)",
          aspectRatio: "1 / 1",
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Circular GitHub contribution calendar. Current streak ${stats.current.days} days.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          style={{ display: "block", width: "100%", height: "100%", cursor: hoveredCell ? "pointer" : "default" }}
        />

        {/* Central Streak Indicator */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <span
            className="font-semibold tabular-nums"
            style={{
              fontFamily: numberFontFamily,
              fontSize: `clamp(2rem, ${size * 0.095}px, 3.25rem)`,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: palette.accent,
            }}
          >
            {displayStreak}
          </span>
          <span
            className="text-[13px] leading-tight"
            style={{
              marginTop: "0.25rem",
              color: "var(--color-muted-foreground, #71717a)",
              fontFamily: numberFontFamily,
              letterSpacing: "normal",
            }}
          >
            Streak
          </span>
        </div>

        {/* Hover Tooltip */}
        {hoveredCell && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-30 whitespace-nowrap rounded px-2.5 py-1.5 text-[12px] leading-none shadow-xl"
            style={{
              left: `${hoveredCell.x}px`,
              top: `${hoveredCell.y}px`,
              transform: "translate(-50%, -130%)",
              background: "#18181b",
              color: "#f2f2f0",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            <strong className="font-semibold">
              {hoveredCell.cell.count ? `${hoveredCell.cell.count} contributions` : "No contributions"}
            </strong>
            <span className="opacity-75"> on {formatDate(hoveredCell.cell.date)}</span>
            <span
              aria-hidden="true"
              className="absolute top-full left-1/2 -translate-x-1/2 h-0 w-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid #18181b",
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
