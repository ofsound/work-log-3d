import { createNamedEntityPayload, validateTimeBoxInput } from '../shared/worklog/validation'

import type { EntityId, TimeBoxInput } from '../shared/worklog/types'

export const LEGACY_IMPORT_EMAIL = 'ben@modernthings.net'
export const LEGACY_SOURCE_PROJECT_ID = 'work-log-3806c'
export const LEGACY_SOURCE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${LEGACY_SOURCE_PROJECT_ID}/databases/(default)`
export const LEGACY_IMPORT_ID_PREFIX = `legacy-${LEGACY_SOURCE_PROJECT_ID}`

type LegacyCollectionName = 'projects' | 'tags' | 'timeBoxes'
type NamedEntityLabel = 'Project' | 'Tag'

interface FirestoreRestValue {
  stringValue?: string
  timestampValue?: string
  arrayValue?: {
    values?: FirestoreRestValue[]
  }
}

export interface FirestoreRestDocument {
  name: string
  fields?: Record<string, FirestoreRestValue>
}

interface FirestoreRestQueryResult {
  document?: FirestoreRestDocument
}

export interface LegacyNamedEntity {
  id: string
  name: string
  slug: string
}

export interface LegacyTimeBox {
  id: string
  startTime: Date
  endTime: Date
  notes: string
  projectLegacyId: string
  tagLegacyIds: string[]
}

export interface LegacyImportDataset {
  projects: LegacyNamedEntity[]
  tags: LegacyNamedEntity[]
  timeBoxes: LegacyTimeBox[]
}

export interface ExistingNamedEntity {
  id: EntityId
  name: string
  slug: string
}

export interface ResolvedLegacyEntities {
  idByLegacyId: Record<string, EntityId>
  entitiesToCreate: Array<{
    id: EntityId
    name: string
    slug: string
  }>
  reusedCount: number
  createdCount: number
}

export interface ImportedTimeBoxRecord {
  id: EntityId
  input: TimeBoxInput
}

const getDocumentIdFromName = (value: string) => {
  const documentId = value.split('/').at(-1)?.trim()

  if (!documentId) {
    throw new Error(`Invalid Firestore document path "${value}".`)
  }

  return documentId
}

const getField = (document: FirestoreRestDocument, fieldName: string) => {
  const field = document.fields?.[fieldName]

  if (!field) {
    throw new Error(`Missing required field "${fieldName}" on ${document.name}.`)
  }

  return field
}

const getStringField = (document: FirestoreRestDocument, fieldName: string) => {
  const value = getField(document, fieldName).stringValue

  if (typeof value !== 'string') {
    throw new Error(`Field "${fieldName}" on ${document.name} must be a string.`)
  }

  return value
}

const getTimestampField = (document: FirestoreRestDocument, fieldName: string) => {
  const value = getField(document, fieldName).timestampValue

  if (typeof value !== 'string') {
    throw new Error(`Field "${fieldName}" on ${document.name} must be a timestamp.`)
  }

  const date = new Date(value)

  if (!Number.isFinite(date.valueOf())) {
    throw new Error(`Field "${fieldName}" on ${document.name} is not a valid timestamp.`)
  }

  return date
}

const getStringArrayField = (document: FirestoreRestDocument, fieldName: string) => {
  const values = getField(document, fieldName).arrayValue?.values ?? []

  return values.map((value, index) => {
    if (typeof value.stringValue !== 'string') {
      throw new Error(`Field "${fieldName}" on ${document.name} has a non-string item at ${index}.`)
    }

    return value.stringValue
  })
}

const buildNormalizedEntityMatchKey = (name: string, label: NamedEntityLabel) => {
  const normalized = createNamedEntityPayload(name, label)

  return `${normalized.name}::${normalized.slug}`
}

const fetchLegacyCollectionDocuments = async (collectionId: LegacyCollectionName) => {
  const response = await fetch(`${LEGACY_SOURCE_BASE_URL}/documents:runQuery`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        orderBy: [
          {
            field: { fieldPath: '__name__' },
            direction: 'ASCENDING',
          },
        ],
      },
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Legacy Firestore query failed for "${collectionId}" with status ${response.status}.`,
    )
  }

  const results = (await response.json()) as FirestoreRestQueryResult[]

  return results.flatMap((result) => (result.document ? [result.document] : []))
}

export const normalizeLegacyNamedEntityDocument = (
  document: FirestoreRestDocument,
  label: NamedEntityLabel,
): LegacyNamedEntity => {
  const normalized = createNamedEntityPayload(getStringField(document, 'name'), label)

  return {
    id: getDocumentIdFromName(document.name),
    name: normalized.name,
    slug: normalized.slug,
  }
}

export const normalizeLegacyTimeBoxDocument = (document: FirestoreRestDocument): LegacyTimeBox => ({
  id: getDocumentIdFromName(document.name),
  startTime: getTimestampField(document, 'startTime'),
  endTime: getTimestampField(document, 'endTime'),
  notes: getStringField(document, 'notes'),
  projectLegacyId: getStringField(document, 'project'),
  tagLegacyIds: getStringArrayField(document, 'tags'),
})

export const fetchLegacyImportDataset = async (): Promise<LegacyImportDataset> => {
  const [projectDocuments, tagDocuments, timeBoxDocuments] = await Promise.all([
    fetchLegacyCollectionDocuments('projects'),
    fetchLegacyCollectionDocuments('tags'),
    fetchLegacyCollectionDocuments('timeBoxes'),
  ])

  const timeBoxes = timeBoxDocuments.map(normalizeLegacyTimeBoxDocument).sort((left, right) => {
    return left.startTime.valueOf() - right.startTime.valueOf() || left.id.localeCompare(right.id)
  })

  return {
    projects: projectDocuments.map((document) =>
      normalizeLegacyNamedEntityDocument(document, 'Project'),
    ),
    tags: tagDocuments.map((document) => normalizeLegacyNamedEntityDocument(document, 'Tag')),
    timeBoxes,
  }
}

export const buildImportedEntityId = (
  collectionName: Extract<LegacyCollectionName, 'projects' | 'tags'>,
  legacyId: string,
) => `${LEGACY_IMPORT_ID_PREFIX}-${collectionName}-${legacyId}`

export const buildImportedTimeBoxId = (legacyId: string) =>
  `${LEGACY_IMPORT_ID_PREFIX}-timeBoxes-${legacyId}`

export const summarizeLegacyDataset = (dataset: LegacyImportDataset) => {
  const sortedStartTimes = dataset.timeBoxes
    .map((timeBox) => timeBox.startTime)
    .sort((left, right) => left.valueOf() - right.valueOf())
  const startDate = sortedStartTimes[0] ?? null
  const endDate = sortedStartTimes.at(-1) ?? null

  return {
    projectCount: dataset.projects.length,
    tagCount: dataset.tags.length,
    timeBoxCount: dataset.timeBoxes.length,
    startDate,
    endDate,
  }
}

export const resolveLegacyEntityImports = ({
  legacyEntities,
  existingEntities,
  collectionName,
  label,
}: {
  legacyEntities: LegacyNamedEntity[]
  existingEntities: ExistingNamedEntity[]
  collectionName: Extract<LegacyCollectionName, 'projects' | 'tags'>
  label: NamedEntityLabel
}): ResolvedLegacyEntities => {
  const existingIdByMatchKey = new Map<string, EntityId>()

  existingEntities.forEach((entity) => {
    existingIdByMatchKey.set(buildNormalizedEntityMatchKey(entity.name, label), entity.id)
  })

  const idByLegacyId: Record<string, EntityId> = {}
  const entitiesToCreate: ResolvedLegacyEntities['entitiesToCreate'] = []
  let reusedCount = 0

  legacyEntities.forEach((entity) => {
    const matchKey = buildNormalizedEntityMatchKey(entity.name, label)
    const existingId = existingIdByMatchKey.get(matchKey)

    if (existingId) {
      idByLegacyId[entity.id] = existingId
      reusedCount += 1
      return
    }

    const importedId = buildImportedEntityId(collectionName, entity.id)
    idByLegacyId[entity.id] = importedId
    entitiesToCreate.push({
      id: importedId,
      name: entity.name,
      slug: entity.slug,
    })
    existingIdByMatchKey.set(matchKey, importedId)
  })

  return {
    idByLegacyId,
    entitiesToCreate,
    reusedCount,
    createdCount: entitiesToCreate.length,
  }
}

export const materializeLegacyImportedTimeBoxes = ({
  legacyTimeBoxes,
  projectIdByLegacyId,
  tagIdByLegacyId,
}: {
  legacyTimeBoxes: LegacyTimeBox[]
  projectIdByLegacyId: Record<string, EntityId>
  tagIdByLegacyId: Record<string, EntityId>
}): ImportedTimeBoxRecord[] =>
  legacyTimeBoxes.map((timeBox) => {
    const projectId = projectIdByLegacyId[timeBox.projectLegacyId]

    if (!projectId) {
      throw new Error(
        `Missing target project mapping for legacy project "${timeBox.projectLegacyId}".`,
      )
    }

    return {
      id: buildImportedTimeBoxId(timeBox.id),
      input: validateTimeBoxInput({
        startTime: timeBox.startTime,
        endTime: timeBox.endTime,
        notes: timeBox.notes,
        project: projectId,
        tags: timeBox.tagLegacyIds.map((tagLegacyId) => {
          const tagId = tagIdByLegacyId[tagLegacyId]

          if (!tagId) {
            throw new Error(`Missing target tag mapping for legacy tag "${tagLegacyId}".`)
          }

          return tagId
        }),
      }),
    }
  })
