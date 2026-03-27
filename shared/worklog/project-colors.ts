import type { ProjectColors } from './types'

interface RgbColor {
  red: number
  green: number
  blue: number
}

export const PROJECT_COLOR_LIGHT_TEXT = '#f8fafc'
export const PROJECT_COLOR_DARK_TEXT = '#111827'
export const PROJECT_COLOR_MIN_CONTRAST_RATIO = 4.5

export const PRIMARY_COLOR_BADGE_TEXT_ERROR = 'Primary color must keep white badge text readable.'
export const SECONDARY_COLOR_GRADIENT_TEXT_ERROR =
  'Secondary color must keep shared text readable across project gradients.'

const hexToRgb = (value: string): RgbColor => {
  const normalized = value.replace('#', '')

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export const getRelativeLuminance = (value: string) => {
  const rgb = hexToRgb(value)
  const channels = [rgb.red, rgb.green, rgb.blue].map((channel) => {
    const normalized = channel / 255

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

export const getContrastRatio = (left: string, right: string) => {
  const leftLuminance = getRelativeLuminance(left)
  const rightLuminance = getRelativeLuminance(right)
  const lighter = Math.max(leftLuminance, rightLuminance)
  const darker = Math.min(leftLuminance, rightLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

export const getBestProjectTextColor = (backgrounds: string[]) => {
  const darkScore = Math.min(
    ...backgrounds.map((background) => getContrastRatio(background, PROJECT_COLOR_DARK_TEXT)),
  )
  const lightScore = Math.min(
    ...backgrounds.map((background) => getContrastRatio(background, PROJECT_COLOR_LIGHT_TEXT)),
  )

  return lightScore >= darkScore ? PROJECT_COLOR_LIGHT_TEXT : PROJECT_COLOR_DARK_TEXT
}

export interface ProjectColorAnalysis {
  badgeTextColor: typeof PROJECT_COLOR_LIGHT_TEXT
  gradientTextColor: string
  primaryContrastWithBadgeText: number
  primaryContrastWithGradientText: number
  secondaryContrastWithGradientText: number
  primarySupportsBadgeText: boolean
  hasAccessibleGradientText: boolean
  isAccessible: boolean
}

export const analyzeProjectColors = (colors: ProjectColors): ProjectColorAnalysis => {
  const gradientTextColor = getBestProjectTextColor([colors.primary, colors.secondary])
  const primaryContrastWithBadgeText = getContrastRatio(colors.primary, PROJECT_COLOR_LIGHT_TEXT)
  const primaryContrastWithGradientText = getContrastRatio(colors.primary, gradientTextColor)
  const secondaryContrastWithGradientText = getContrastRatio(colors.secondary, gradientTextColor)
  const primarySupportsBadgeText = primaryContrastWithBadgeText >= PROJECT_COLOR_MIN_CONTRAST_RATIO
  const hasAccessibleGradientText =
    Math.min(primaryContrastWithGradientText, secondaryContrastWithGradientText) >=
    PROJECT_COLOR_MIN_CONTRAST_RATIO

  return {
    badgeTextColor: PROJECT_COLOR_LIGHT_TEXT,
    gradientTextColor,
    primaryContrastWithBadgeText,
    primaryContrastWithGradientText,
    secondaryContrastWithGradientText,
    primarySupportsBadgeText,
    hasAccessibleGradientText,
    isAccessible: primarySupportsBadgeText && hasAccessibleGradientText,
  }
}

export const getProjectColorValidationMessages = (colors: ProjectColors) => {
  const analysis = analyzeProjectColors(colors)
  const messages: string[] = []

  if (!analysis.primarySupportsBadgeText) {
    messages.push(PRIMARY_COLOR_BADGE_TEXT_ERROR)
  }

  if (!analysis.hasAccessibleGradientText) {
    messages.push(SECONDARY_COLOR_GRADIENT_TEXT_ERROR)
  }

  return messages
}
