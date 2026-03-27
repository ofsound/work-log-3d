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

export const getProjectOpaqueSoftSurfaceStyle = (colors: ProjectColors): CSSProperties => ({
  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, var(--color-surface))`,
  borderColor: toRgba(colors.primary, 0.42),
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
 * List / Calendar / Edit toggle (soft tinted rail; inactive labels use primary tint; active
 * segment uses solid primary like the duration badge).
 */
export const getProjectWorkspaceModeToggleStyles = (
  colors: ProjectColors,
): {
  container: CSSProperties
  activeButton: CSSProperties
  inactiveButton: CSSProperties
} => ({
  container: getProjectSoftSurfaceStyle(colors),
  activeButton: getProjectBadgeStyle(colors),
  inactiveButton: {
    color: toRgba(colors.primary, 0.82),
    /** Hover gradient in `ProjectWorkspaceHeader` (mix rail → solid active). */
    '--project-mode-toggle-rail': toRgba(colors.primary, 0.14),
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
    '--project-picker-border': toRgba(colors.primary, 0.26),
    '--project-picker-from-hover': toRgba(colors.primary, 0.24),
    '--project-picker-to-hover': toRgba(endColor, 0.24),
    '--project-picker-border-hover': toRgba(colors.primary, 0.44),
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
