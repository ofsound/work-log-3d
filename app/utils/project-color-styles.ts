import type { CSSProperties } from 'vue'

import type { ProjectColors } from '~~/shared/worklog'

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

const getRelativeLuminance = (value: string) => {
  const rgb = hexToRgb(value)
  const channels = [rgb.red, rgb.green, rgb.blue].map((channel) => {
    const normalized = channel / 255

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

const getContrastRatio = (left: string, right: string) => {
  const leftLuminance = getRelativeLuminance(left)
  const rightLuminance = getRelativeLuminance(right)
  const lighter = Math.max(leftLuminance, rightLuminance)
  const darker = Math.min(leftLuminance, rightLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

const getAutoTextColor = (backgrounds: string[]) => {
  const dark = '#111827'
  const light = '#f8fafc'
  const darkScore = Math.min(...backgrounds.map((background) => getContrastRatio(background, dark)))
  const lightScore = Math.min(
    ...backgrounds.map((background) => getContrastRatio(background, light)),
  )

  return lightScore >= darkScore ? light : dark
}

const getGradientEndColor = (colors: ProjectColors) => colors.secondary

export const getProjectBadgeStyle = (colors: ProjectColors): CSSProperties => {
  const textColor = getAutoTextColor([colors.primary])

  return {
    backgroundColor: colors.primary,
    borderColor: toRgba(colors.primary, 0.5),
    color: textColor,
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

  return {
    backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${endColor})`,
    color: getAutoTextColor([colors.primary, endColor]),
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

export const hasLowProjectContrast = (colors: ProjectColors) => {
  const endColor = getGradientEndColor(colors)
  const textColor = getAutoTextColor([colors.primary, endColor])

  return (
    getContrastRatio(colors.primary, endColor) < 1.18 ||
    getContrastRatio(colors.primary, textColor) < 4.5 ||
    getContrastRatio(endColor, textColor) < 4.5
  )
}
