import type { Project, ProjectColors } from './types'

const HEX_COLOR_PATTERN = /^#?([\da-f]{3}|[\da-f]{6})$/i

export const PROJECT_COLOR_PALETTE = [
  { primary: '#2563eb', secondary: '#06b6d4' },
  { primary: '#059669', secondary: '#84cc16' },
  { primary: '#dc2626', secondary: '#f97316' },
  { primary: '#7c3aed', secondary: '#ec4899' },
  { primary: '#0f766e', secondary: '#38bdf8' },
  { primary: '#ca8a04', secondary: '#f97316' },
  { primary: '#4f46e5', secondary: '#22c55e' },
  { primary: '#be123c', secondary: '#fb7185' },
  { primary: '#1d4ed8', secondary: '#60a5fa' },
  { primary: '#15803d', secondary: '#2dd4bf' },
  { primary: '#b45309', secondary: '#f59e0b' },
  { primary: '#4338ca', secondary: '#a855f7' },
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
  const hasStoredColors = colors !== null && typeof colors === 'object'

  const primary = normalizeHexColor(colors?.primary ?? '') ?? fallback.primary
  const secondary =
    normalizeHexColor(hasStoredColors ? (colors?.secondary ?? '') : '') ?? fallback.secondary

  return {
    primary,
    secondary,
  } satisfies ProjectColors
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
