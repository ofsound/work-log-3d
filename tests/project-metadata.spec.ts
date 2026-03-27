import { describe, expect, it } from 'vitest'

import {
  analyzeProjectColors,
  createDuplicateSlugError,
  createProjectPayload,
  getProjectDefaultMetadata,
  getWorklogErrorMessage,
  PRIMARY_COLOR_BADGE_TEXT_ERROR,
  PROJECT_COLOR_PALETTE,
  projectsForSessionPicker,
  resolveProjectColors,
  SECONDARY_COLOR_GRADIENT_TEXT_ERROR,
  validateProjectInput,
} from '../shared/worklog'

describe('project metadata helpers', () => {
  it('normalizes project payloads into the stored shape', () => {
    expect(
      createProjectPayload({
        name: '  Client Portal  ',
        notes: '  Needs billing polish  ',
        colors: {
          primary: '#1D4ED8',
          secondary: '4338ca',
        },
        archived: false,
      }),
    ).toEqual({
      name: 'Client Portal',
      slug: 'client-portal',
      notes: 'Needs billing polish',
      colors: {
        primary: '#1d4ed8',
        secondary: '#4338ca',
      },
      archived: false,
    })
  })

  it('rejects malformed color input', () => {
    expect(() =>
      validateProjectInput({
        name: 'Project Atlas',
        notes: '',
        colors: {
          primary: 'blue',
          secondary: '#0e7490',
        },
        archived: false,
      }),
    ).toThrow('Primary color must be a valid hex color.')
  })

  it('rejects invalid secondary color', () => {
    expect(() =>
      validateProjectInput({
        name: 'Project Atlas',
        notes: '',
        colors: {
          primary: '#2563eb',
          secondary: '',
        },
        archived: false,
      }),
    ).toThrow('Secondary color must be a valid hex color.')
  })

  it('rejects reserved project routes as generated slugs', () => {
    expect(() =>
      createProjectPayload({
        name: 'New',
        notes: '',
        colors: {
          primary: '#2563eb',
          secondary: '#0e7490',
        },
        archived: false,
      }),
    ).toThrow('Project name would conflict with a reserved project route.')
  })

  it('rejects primaries that cannot keep white badge text readable', () => {
    expect(() =>
      validateProjectInput({
        name: 'Project Atlas',
        notes: '',
        colors: {
          primary: '#059669',
          secondary: '#4d7c0f',
        },
        archived: false,
      }),
    ).toThrow(PRIMARY_COLOR_BADGE_TEXT_ERROR)
  })

  it('rejects secondaries that break shared gradient text contrast', () => {
    expect(() =>
      validateProjectInput({
        name: 'Project Atlas',
        notes: '',
        colors: {
          primary: '#2563eb',
          secondary: '#06b6d4',
        },
        archived: false,
      }),
    ).toThrow(SECONDARY_COLOR_GRADIENT_TEXT_ERROR)
  })

  it('returns deterministic fallback colors for legacy projects', () => {
    const firstResolution = resolveProjectColors('legacy-project-1', undefined)
    const secondResolution = resolveProjectColors('legacy-project-1', undefined)

    expect(firstResolution).toEqual(secondResolution)
    expect(PROJECT_COLOR_PALETTE).toContainEqual(firstResolution)
  })

  it('uses palette secondary fallback when stored colors omit a valid secondary', () => {
    const fullFallback = resolveProjectColors('seed-a', undefined)
    const partial = resolveProjectColors('seed-a', { primary: fullFallback.primary })

    expect(partial.primary).toBe(fullFallback.primary)
    expect(partial.secondary).toBe(fullFallback.secondary)
  })

  it('falls back to a compliant palette pair when stored colors fail the new rules', () => {
    const fallback = resolveProjectColors('seed-b', undefined)
    const resolved = resolveProjectColors('seed-b', {
      primary: '#2563eb',
      secondary: '#06b6d4',
    })

    expect(resolved).toEqual(fallback)
  })

  it('exposes duplicate slug errors for repository and UI messaging', () => {
    const projectError = createDuplicateSlugError('project')
    const tagError = createDuplicateSlugError('tag')

    expect(projectError.code).toBe('duplicate-slug')
    expect(tagError.code).toBe('duplicate-slug')
    expect(getWorklogErrorMessage(projectError, 'fallback')).toBe(
      'Another project already uses this name.',
    )
    expect(getWorklogErrorMessage(tagError, 'fallback')).toBe('Another tag already uses this name.')
  })

  it('includes archived in normalized project payloads', () => {
    expect(
      createProjectPayload({
        name: 'Alpha',
        notes: '',
        colors: { primary: '#2563eb', secondary: '#0e7490' },
        archived: true,
      }).archived,
    ).toBe(true)
    expect(
      validateProjectInput({
        name: 'Beta',
        notes: '',
        colors: { primary: '#2563eb', secondary: '#0e7490' },
        archived: false,
      }).archived,
    ).toBe(false)
  })

  it('builds session picker lists with the selected archived project included once', () => {
    const projects = [
      {
        id: 'a',
        name: 'Active',
        slug: 'active',
        notes: '',
        colors: { primary: '#111111', secondary: '#333333' },
        archived: false,
      },
      {
        id: 'b',
        name: 'Gone',
        slug: 'gone',
        notes: '',
        colors: { primary: '#222222', secondary: '#444444' },
        archived: true,
      },
    ] as const
    expect(projectsForSessionPicker([...projects], '').map((p) => p.id)).toEqual(['a'])
    expect(projectsForSessionPicker([...projects], 'b').map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('exposes a rotating default metadata palette', () => {
    expect(getProjectDefaultMetadata(0)).toEqual({
      notes: '',
      colors: PROJECT_COLOR_PALETTE[0],
      archived: false,
    })
    expect(getProjectDefaultMetadata(PROJECT_COLOR_PALETTE.length)).toEqual({
      notes: '',
      colors: PROJECT_COLOR_PALETTE[0],
      archived: false,
    })
  })

  it('keeps every preset palette entry compliant with the shared project color rules', () => {
    expect(PROJECT_COLOR_PALETTE.every((colors) => analyzeProjectColors(colors).isAccessible)).toBe(
      true,
    )
  })
})
