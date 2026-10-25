<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

/**
 * Generative SVG line-art background — "Argon" preset.
 *
 * Renders procedural technical diagrams: circuit traces, node clusters,
 * arc segments, and cross-hairs. Uses a seeded PRNG so the pattern is
 * deterministic per viewport size but regenerates on resize.
 *
 * Intentionally very low-contrast and thin-stroked.
 */

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LineSeg {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface ArcSeg {
  cx: number
  cy: number
  r: number
  startAngle: number
  endAngle: number
}

interface NodeDot {
  cx: number
  cy: number
  r: number
}

interface CrossHair {
  cx: number
  cy: number
  size: number
}

// ---------------------------------------------------------------------------
// Reactive viewport
// ---------------------------------------------------------------------------
const width = ref(1920)
const height = ref(1080)

function measure() {
  width.value = window.innerWidth
  height.value = window.innerHeight
}

let resizeTimer: ReturnType<typeof setTimeout> | undefined

function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(measure, 200)
}

onMounted(() => {
  measure()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
})

// ---------------------------------------------------------------------------
// Generate art
// ---------------------------------------------------------------------------
const art = computed(() => {
  const w = width.value
  const h = height.value
  const rand = mulberry32(w * 7 + h * 13 + 42)

  const lines: LineSeg[] = []
  const arcs: ArcSeg[] = []
  const nodes: NodeDot[] = []
  const crosshairs: CrossHair[] = []

  // helpers
  const rx = () => rand() * w
  const ry = () => rand() * h
  const pickDir = (arr: number[]): number => arr[Math.floor(rand() * arr.length)]!

  // --- Circuit traces: orthogonal or diagonal paths --------------------
  const traceCount = Math.floor((w * h) / 48000)
  for (let i = 0; i < traceCount; i++) {
    let x = rx()
    let y = ry()
    const segCount = 2 + Math.floor(rand() * 4)
    for (let j = 0; j < segCount; j++) {
      const len = 30 + rand() * 120
      const dir = pickDir([0, 1, 2, 3, 4, 5]) // 0-3 ortho, 4-5 diagonal
      let nx: number
      let ny: number
      switch (dir) {
        case 0:
          nx = x + len
          ny = y
          break
        case 1:
          nx = x - len
          ny = y
          break
        case 2:
          nx = x
          ny = y + len
          break
        case 3:
          nx = x
          ny = y - len
          break
        case 4:
          nx = x + len * 0.707
          ny = y + len * 0.707
          break
        default:
          nx = x - len * 0.707
          ny = y - len * 0.707
          break
      }
      lines.push({ x1: x, y1: y, x2: nx, y2: ny })
      // node at junction
      if (rand() > 0.55) {
        nodes.push({ cx: x, cy: y, r: 1.2 + rand() * 1.8 })
      }
      x = nx
      y = ny
    }
    // terminal node
    nodes.push({ cx: x, cy: y, r: 1.5 + rand() * 2 })
  }

  // --- Arc segments (partial circles) ----------------------------------
  const arcCount = Math.floor((w * h) / 180000)
  for (let i = 0; i < arcCount; i++) {
    const cx = rx()
    const cy = ry()
    const r = 20 + rand() * 80
    const start = rand() * Math.PI * 2
    const span = Math.PI / 4 + rand() * Math.PI
    arcs.push({ cx, cy, r, startAngle: start, endAngle: start + span })
  }

  // --- Cross-hairs (registration marks) --------------------------------
  const chCount = Math.floor((w * h) / 320000)
  for (let i = 0; i < chCount; i++) {
    crosshairs.push({ cx: rx(), cy: ry(), size: 6 + rand() * 10 })
  }

  return { lines, arcs, nodes, crosshairs }
})

// Build arc SVG path
function arcPath(a: ArcSeg): string {
  const x1 = a.cx + a.r * Math.cos(a.startAngle)
  const y1 = a.cy + a.r * Math.sin(a.startAngle)
  const x2 = a.cx + a.r * Math.cos(a.endAngle)
  const y2 = a.cy + a.r * Math.sin(a.endAngle)
  const large = a.endAngle - a.startAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${a.r} ${a.r} 0 ${large} 1 ${x2} ${y2}`
}
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    xmlns="http://www.w3.org/2000/svg"
    class="pointer-events-none h-full w-full select-none"
    data-shell-background="argon"
    aria-hidden="true"
  >
    <!-- Circuit trace lines -->
    <line
      v-for="(l, i) in art.lines"
      :key="'l' + i"
      :x1="l.x1"
      :y1="l.y1"
      :x2="l.x2"
      :y2="l.y2"
      class="fill-none stroke-shell-argon-line stroke-[0.5]"
    />

    <!-- Arc segments -->
    <path
      v-for="(a, i) in art.arcs"
      :key="'a' + i"
      :d="arcPath(a)"
      class="fill-none stroke-shell-argon-arc stroke-[0.5]"
    />

    <!-- Node dots -->
    <circle
      v-for="(n, i) in art.nodes"
      :key="'n' + i"
      :cx="n.cx"
      :cy="n.cy"
      :r="n.r"
      class="fill-shell-argon-node"
    />

    <!-- Cross-hairs -->
    <g
      v-for="(ch, i) in art.crosshairs"
      :key="'ch' + i"
      class="fill-none stroke-shell-argon-mark stroke-[0.5]"
    >
      <line :x1="ch.cx - ch.size" :y1="ch.cy" :x2="ch.cx + ch.size" :y2="ch.cy" />
      <line :x1="ch.cx" :y1="ch.cy - ch.size" :x2="ch.cx" :y2="ch.cy + ch.size" />
      <circle :cx="ch.cx" :cy="ch.cy" :r="ch.size * 0.45" fill="none" />
    </g>
  </svg>
</template>
