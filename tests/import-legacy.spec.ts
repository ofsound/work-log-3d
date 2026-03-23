import { describe, expect, it } from 'vitest'

import {
  buildImportedEntityId,
  buildImportedTimeBoxId,
  materializeLegacyImportedTimeBoxes,
  normalizeLegacyNamedEntityDocument,
  normalizeLegacyTimeBoxDocument,
  resolveLegacyEntityImports,
  summarizeLegacyDataset,
  type FirestoreRestDocument,
} from '../scripts/import-legacy-data'

const buildNamedEntityDocument = (path: string, name: string): FirestoreRestDocument => ({
  name: path,
  fields: {
    name: {
      stringValue: name,
    },
    slug: {
      stringValue: 'ignored-by-normalizer',
    },
  },
})

const buildTimeBoxDocument = ({
  id,
  startTime,
  endTime,
  notes,
  project,
  tags,
}: {
  id: string
  startTime: string
  endTime: string
  notes: string
  project: string
  tags: string[]
}): FirestoreRestDocument => ({
  name: `projects/work-log-3806c/databases/(default)/documents/timeBoxes/${id}`,
  fields: {
    startTime: {
      timestampValue: startTime,
    },
    endTime: {
      timestampValue: endTime,
    },
    notes: {
      stringValue: notes,
    },
    project: {
      stringValue: project,
    },
    tags: {
      arrayValue: {
        values: tags.map((tag) => ({
          stringValue: tag,
        })),
      },
    },
  },
})

describe('legacy import helpers', () => {
  it('normalizes legacy named entity documents from Firestore REST results', () => {
    expect(
      normalizeLegacyNamedEntityDocument(
        buildNamedEntityDocument(
          'projects/work-log-3806c/databases/(default)/documents/projects/legacy-project',
          '  Photo Portfolio  ',
        ),
        'Project',
      ),
    ).toEqual({
      id: 'legacy-project',
      name: 'Photo Portfolio',
      slug: 'photo-portfolio',
    })
  })

  it('normalizes legacy timeboxes from Firestore REST results', () => {
    const timeBox = normalizeLegacyTimeBoxDocument(
      buildTimeBoxDocument({
        id: 'legacy-timebox',
        startTime: '2026-03-19T20:49:00Z',
        endTime: '2026-03-19T21:49:00Z',
        notes: 'First MVPs of unit tests.',
        project: 'legacy-project',
        tags: ['tag-1', 'tag-2'],
      }),
    )

    expect(timeBox.id).toBe('legacy-timebox')
    expect(timeBox.projectLegacyId).toBe('legacy-project')
    expect(timeBox.tagLegacyIds).toEqual(['tag-1', 'tag-2'])
    expect(timeBox.startTime.toISOString()).toBe('2026-03-19T20:49:00.000Z')
    expect(timeBox.endTime.toISOString()).toBe('2026-03-19T21:49:00.000Z')
  })

  it('reuses existing entities by normalized exact name and creates deterministic ids for unmatched entities', () => {
    const result = resolveLegacyEntityImports({
      legacyEntities: [
        { id: 'legacy-project-1', name: 'Photo Portfolio', slug: 'photo-portfolio' },
        { id: 'legacy-project-2', name: 'Snake Oil', slug: 'snake-oil' },
      ],
      existingEntities: [
        { id: 'current-project-1', name: '  Photo Portfolio ', slug: 'photo-portfolio' },
      ],
      collectionName: 'projects',
      label: 'Project',
    })

    expect(result.idByLegacyId).toEqual({
      'legacy-project-1': 'current-project-1',
      'legacy-project-2': buildImportedEntityId('projects', 'legacy-project-2'),
    })
    expect(result.entitiesToCreate).toEqual([
      {
        id: buildImportedEntityId('projects', 'legacy-project-2'),
        name: 'Snake Oil',
        slug: 'snake-oil',
      },
    ])
    expect(result.reusedCount).toBe(1)
    expect(result.createdCount).toBe(1)
  })

  it('maps legacy entities that share a normalized slug onto one imported project id', () => {
    const result = resolveLegacyEntityImports({
      legacyEntities: [
        { id: 'legacy-project-1', name: 'Foo', slug: 'foo' },
        { id: 'legacy-project-2', name: 'Foo!', slug: 'foo' },
      ],
      existingEntities: [],
      collectionName: 'projects',
      label: 'Project',
    })

    const firstId = buildImportedEntityId('projects', 'legacy-project-1')

    expect(result.idByLegacyId).toEqual({
      'legacy-project-1': firstId,
      'legacy-project-2': firstId,
    })
    expect(result.entitiesToCreate).toEqual([
      {
        id: firstId,
        name: 'Foo',
        slug: 'foo',
      },
    ])
    expect(result.createdCount).toBe(1)
    expect(result.reusedCount).toBe(1)
  })

  it('materializes validated imported timeboxes with deterministic ids', () => {
    const importedTimeBoxes = materializeLegacyImportedTimeBoxes({
      legacyTimeBoxes: [
        {
          id: 'legacy-timebox',
          startTime: new Date('2026-03-19T20:49:00Z'),
          endTime: new Date('2026-03-19T21:49:00Z'),
          notes: 'First MVPs of unit tests.',
          projectLegacyId: 'legacy-project',
          tagLegacyIds: ['legacy-tag-1', 'legacy-tag-2'],
        },
      ],
      projectIdByLegacyId: {
        'legacy-project': 'project-1',
      },
      tagIdByLegacyId: {
        'legacy-tag-1': 'tag-1',
        'legacy-tag-2': 'tag-2',
      },
    })

    expect(importedTimeBoxes).toEqual([
      {
        id: buildImportedTimeBoxId('legacy-timebox'),
        input: {
          startTime: new Date('2026-03-19T20:49:00Z'),
          endTime: new Date('2026-03-19T21:49:00Z'),
          notes: 'First MVPs of unit tests.',
          project: 'project-1',
          tags: ['tag-1', 'tag-2'],
        },
      },
    ])
  })

  it('keeps imported ids stable across reruns and reports date-range summaries', () => {
    const dataset = {
      projects: [{ id: 'project-1', name: 'Photo Portfolio', slug: 'photo-portfolio' }],
      tags: [{ id: 'tag-1', name: 'app', slug: 'app' }],
      timeBoxes: [
        {
          id: 'timebox-2',
          startTime: new Date('2026-03-19T20:49:00Z'),
          endTime: new Date('2026-03-19T21:49:00Z'),
          notes: 'Later session',
          projectLegacyId: 'project-1',
          tagLegacyIds: ['tag-1'],
        },
        {
          id: 'timebox-1',
          startTime: new Date('2025-11-09T17:37:00Z'),
          endTime: new Date('2025-11-09T18:07:00Z'),
          notes: 'Earlier session',
          projectLegacyId: 'project-1',
          tagLegacyIds: ['tag-1'],
        },
      ],
    }

    expect(buildImportedTimeBoxId('timebox-1')).toBe(buildImportedTimeBoxId('timebox-1'))
    expect(summarizeLegacyDataset(dataset)).toEqual({
      projectCount: 1,
      tagCount: 1,
      timeBoxCount: 2,
      startDate: new Date('2025-11-09T17:37:00Z'),
      endDate: new Date('2026-03-19T20:49:00Z'),
    })
  })
})
