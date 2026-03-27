import type { Project, ProjectColors } from './types'
import { analyzeProjectColors } from './project-colors'

const HEX_COLOR_PATTERN = /^#?([\da-f]{3}|[\da-f]{6})$/i

export const PROJECT_COLOR_PALETTE = [
  { primary: '#2563eb', secondary: '#0e7490' },
  { primary: '#047857', secondary: '#4d7c0f' },
  { primary: '#dc2626', secondary: '#c2410c' },
  { primary: '#7c3aed', secondary: '#be185d' },
  { primary: '#0f766e', secondary: '#0369a1' },
  { primary: '#b45309', secondary: '#9a3412' },
  { primary: '#4f46e5', secondary: '#166534' },
  { primary: '#be123c', secondary: '#9d174d' },
  { primary: '#1d4ed8', secondary: '#4338ca' },
  { primary: '#15803d', secondary: '#075985' },
  { primary: '#b91c1c', secondary: '#7c2d12' },
  { primary: '#4338ca', secondary: '#5b21b6' },
] as const satisfies readonly ProjectColors[]

export const normalizeHexColor = (value: string) => {
  const normalized = value.trim().toLowerCase()
  const match = HEX_COLOR_PATTERN.exec(normalized)

  if (!match) {
    return null
  }

  const digits = match[1]

  if (!digits) {
    return null
  }

  if (digits.length === 3) {
    return `#${digits
      .split('')
      .map((digit) => `${digit}${digit}`)
      .join('')}`
  }

  return `#${digits}`
}

export const getProjectColorPaletteEntry = (index: number): ProjectColors => {
  const safeIndex =
    ((Math.trunc(index) % PROJECT_COLOR_PALETTE.length) + PROJECT_COLOR_PALETTE.length) %
    PROJECT_COLOR_PALETTE.length

  return { ...PROJECT_COLOR_PALETTE[safeIndex]! }
}

export const getProjectDefaultMetadata = (index: number) => ({
  notes: '',
  colors: getProjectColorPaletteEntry(index),
  archived: false,
})

export const getProjectPaletteIndexFromSeed = (seed: string) => {
  const normalized = seed.trim()

  if (!normalized) {
    return 0
  }

  let hash = 0

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0
  }

  return hash % PROJECT_COLOR_PALETTE.length
}

export const resolveProjectColors = (
  projectId: string,
  colors: Partial<ProjectColors> | null | undefined,
) => {
  const fallback = getProjectColorPaletteEntry(getProjectPaletteIndexFromSeed(projectId))
  const primary = normalizeHexColor(colors?.primary ?? '')
  const secondary = normalizeHexColor(colors?.secondary ?? '')

  if (!primary || !secondary) {
    return fallback
  }

  const resolved = {
    primary,
    secondary,
  } satisfies ProjectColors

  return analyzeProjectColors(resolved).isAccessible ? resolved : fallback
}

export const resolveProjectNotes = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim() : ''

/** Session editor pickers: active projects plus the selected project when it is archived. */
export const projectsForSessionPicker = (projects: Project[], selectedProjectId: string) => {
  const byId = new Map(projects.map((p) => [p.id, p]))
  const selected = selectedProjectId ? byId.get(selectedProjectId) : undefined
  const base = projects.filter((p) => !p.archived)
  if (selected?.archived) {
    return [...base, selected]
  }
  return base
}
