import { describe, expect, it } from 'vitest'

import {
  analyzeProjectColors,
  PROJECT_COLOR_DARK_TEXT,
  PROJECT_COLOR_LIGHT_TEXT,
} from '../shared/worklog'

describe('project color analysis', () => {
  it('keeps badge text white for compliant project colors', () => {
    const analysis = analyzeProjectColors({
      primary: '#2563eb',
      secondary: '#0e7490',
    })

    expect(analysis.badgeTextColor).toBe(PROJECT_COLOR_LIGHT_TEXT)
    expect(analysis.primarySupportsBadgeText).toBe(true)
    expect(analysis.primaryContrastWithBadgeText).toBeGreaterThanOrEqual(4.5)
  })

  it('chooses dark shared text when both gradient colors support it better', () => {
    const analysis = analyzeProjectColors({
      primary: '#2563eb',
      secondary: '#06b6d4',
    })

    expect(analysis.gradientTextColor).toBe(PROJECT_COLOR_DARK_TEXT)
    expect(analysis.hasAccessibleGradientText).toBe(false)
    expect(analysis.primaryContrastWithGradientText).toBeLessThan(4.5)
  })

  it('fails the gradient rule when either side drops below the shared contrast threshold', () => {
    const analysis = analyzeProjectColors({
      primary: '#7c3aed',
      secondary: '#ec4899',
    })

    expect(analysis.gradientTextColor).toBe(PROJECT_COLOR_LIGHT_TEXT)
    expect(analysis.secondaryContrastWithGradientText).toBeLessThan(4.5)
    expect(analysis.hasAccessibleGradientText).toBe(false)
  })
})
