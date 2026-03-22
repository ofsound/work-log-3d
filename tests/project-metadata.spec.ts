import { describe, expect, it } from 'vitest'

import {
  createProjectPayload,
  getProjectDefaultMetadata,
  PROJECT_COLOR_PALETTE,
  resolveProjectColors,
  validateProjectInput,
} from '../shared/worklog'

describe('project metadata helpers', () => {
  it('normalizes project payloads into the stored shape', () => {
    expect(
      createProjectPayload({
        name: '  Client Portal  ',
        notes: '  Needs billing polish  ',
        colors: {
          primary: '#ABCDEF',
          secondary: '123456',
        },
      }),
    ).toEqual({
      name: 'Client Portal',
      slug: 'client-portal',
      notes: 'Needs billing polish',
      colors: {
        primary: '#abcdef',
        secondary: '#123456',
      },
    })
  })

  it('rejects malformed color input', () => {
    expect(() =>
      validateProjectInput({
        name: 'Project Atlas',
        notes: '',
        colors: {
          primary: 'blue',
          secondary: null,
        },
      }),
    ).toThrow('Primary color must be a valid hex color.')
  })

  it('returns deterministic fallback colors for legacy projects', () => {
    const firstResolution = resolveProjectColors('legacy-project-1', undefined)
    const secondResolution = resolveProjectColors('legacy-project-1', undefined)

    expect(firstResolution).toEqual(secondResolution)
    expect(PROJECT_COLOR_PALETTE).toContainEqual(firstResolution)
  })

  it('exposes a rotating default metadata palette', () => {
    expect(getProjectDefaultMetadata(0)).toEqual({
      notes: '',
      colors: PROJECT_COLOR_PALETTE[0],
    })
    expect(getProjectDefaultMetadata(PROJECT_COLOR_PALETTE.length)).toEqual({
      notes: '',
      colors: PROJECT_COLOR_PALETTE[0],
    })
  })
})
