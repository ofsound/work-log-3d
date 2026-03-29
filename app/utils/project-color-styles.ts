import type { CSSProperties } from 'vue'

import {
  analyzeProjectColors,
  PROJECT_COLOR_LIGHT_TEXT,
  type ProjectColors,
} from '~~/shared/worklog'

interface RgbColor {
  red: number
  green: number
  blue: number
}

const hexToRgb = (value: string): RgbColor => {
  const normalized = value.replace('#', '')

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

const toRgba = (value: string, alpha: number) => {
  const rgb = hexToRgb(value)

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`
}

const getGradientEndColor = (colors: ProjectColors) => colors.secondary

const mixWithSurface = (value: string, amount: number) =>
  `color-mix(in srgb, ${value} ${amount}%, var(--color-surface))`

/** Uses `--project-duotone-mix-*` from theme so dark mode can use a higher mix than light. */
const mixWithSurfaceDuotone = (value: string, mixCustomProperty: string) =>
  `color-mix(in srgb, ${value} var(${mixCustomProperty}), var(--color-surface))`

const mixColors = (left: string, leftAmount: number, right: string) =>
  `color-mix(in srgb, ${left} ${leftAmount}%, ${right})`

export const getProjectBadgeStyle = (colors: ProjectColors): CSSProperties => {
  return {
    backgroundColor: colors.primary,
    borderColor: toRgba(colors.primary, 0.5),
    color: PROJECT_COLOR_LIGHT_TEXT,
  }
}

export const getProjectSoftSurfaceStyle = (colors: ProjectColors): CSSProperties => ({
  backgroundColor: toRgba(colors.primary, 0.14),
  borderColor: toRgba(colors.primary, 0.42),
})

export const getProjectSecondarySoftSurfaceStyle = (colors: ProjectColors): CSSProperties => ({
  backgroundColor: mixWithSurface(colors.secondary, 12),
  borderColor: toRgba(colors.secondary, 0.38),
})

export const getProjectDuotoneSoftSurfaceStyle = (colors: ProjectColors): CSSProperties => ({
  backgroundColor: mixWithSurfaceDuotone(colors.primary, '--project-duotone-mix-base'),
  backgroundImage: `linear-gradient(135deg, ${mixWithSurfaceDuotone(colors.primary, '--project-duotone-mix-gradient')}, ${mixWithSurfaceDuotone(colors.secondary, '--project-duotone-mix-gradient')})`,
  borderColor: mixColors(colors.secondary, 58, colors.primary),
})

/** Session cards in `TimeBoxViewer`: solid primary tint (same in panel overlay and elsewhere). */
export const getProjectTimeBoxSurfaceStyle = (colors: ProjectColors): CSSProperties => ({
  backgroundColor: mixWithSurface(colors.primary, 10),
  borderColor: toRgba(colors.primary, 0.42),
})

export const getProjectOpaqueSoftSurfaceStyle = (colors: ProjectColors): CSSProperties => ({
  backgroundColor: mixWithSurface(colors.primary, 10),
  backgroundImage: `linear-gradient(135deg, ${mixWithSurface(colors.primary, 12)}, ${mixWithSurface(colors.secondary, 10)})`,
  borderColor: mixColors(colors.secondary, 56, colors.primary),
})

export const getProjectHeaderStyle = (colors: ProjectColors): CSSProperties => {
  const endColor = getGradientEndColor(colors)
  const analysis = analyzeProjectColors(colors)

  return {
    backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${endColor})`,
    color: analysis.gradientTextColor,
  }
}

/**
 * Neutral project sub-header bar: no full-width gradient. Applies project colors to the
 * List / Calendar / Edit toggle (duotone rail; inactive labels lean on secondary; active
 * segment stays solid primary like the duration badge).
 */
export const getProjectModeToggleStyles = (
  colors: ProjectColors,
): {
  container: CSSProperties
  activeButton: CSSProperties
  inactiveButton: CSSProperties
} => ({
  container: getProjectDuotoneSoftSurfaceStyle(colors),
  activeButton: getProjectBadgeStyle(colors),
  inactiveButton: {
    color: mixColors(colors.secondary, 74, 'var(--color-text)'),
    /** Hover gradient in `ProjectWorkspaceHeader` (mix rail → solid active). */
    '--project-mode-toggle-rail-start': mixWithSurface(colors.primary, 12),
    '--project-mode-toggle-rail-end': mixWithSurface(colors.secondary, 16),
    '--project-mode-toggle-active': colors.primary,
  } as CSSProperties,
})

/** Session editor project radios: full gradient when selected; unselected uses muted tint + CSS vars for hover. */
export const getProjectPickerOptionStyle = (
  colors: ProjectColors,
  selected: boolean,
): CSSProperties => {
  if (selected) {
    return {
      ...getProjectHeaderStyle(colors),
      borderColor: toRgba(colors.primary, 0.55),
    }
  }

  const endColor = getGradientEndColor(colors)

  return {
    '--project-picker-from': toRgba(colors.primary, 0.1),
    '--project-picker-to': toRgba(endColor, 0.1),
    '--project-picker-border': toRgba(colors.secondary, 0.34),
    '--project-picker-from-hover': toRgba(colors.primary, 0.24),
    '--project-picker-to-hover': toRgba(endColor, 0.24),
    '--project-picker-border-hover': toRgba(colors.secondary, 0.48),
    color: 'var(--color-text)',
  } as CSSProperties
}

export const getProjectSwatchStyle = (colors: ProjectColors): CSSProperties => {
  const endColor = getGradientEndColor(colors)

  return {
    backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${endColor})`,
  }
}

export const getProjectAccentTextStyle = (colors: ProjectColors): CSSProperties => ({
  color: colors.primary,
})

export const getProjectSecondaryAccentTextStyle = (colors: ProjectColors): CSSProperties => ({
  color: mixColors(colors.secondary, 74, 'var(--color-text)'),
})
