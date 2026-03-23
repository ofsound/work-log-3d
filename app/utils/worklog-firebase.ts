import {
  Timestamp,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'

import type { CollectionReference, DocumentData } from 'firebase/firestore'
import type {
  Project,
  Report,
  ReportInput,
  Tag,
  TimeBox,
  TimeBoxInput,
  UserSettings,
  WorklogRepositories,
} from '~~/shared/worklog'
import {
  createDuplicateSlugError,
  createEntityInUseError,
  createNamedEntityPayload,
  createProjectPayload,
  resolveProjectColors,
  resolveProjectNotes,
  resolveUserSettings,
  validateReportInput,
  validateTimeBoxInput,
  validateUserSettingsInput,
} from '~~/shared/worklog'

export interface FirebaseTimestampLike {
  toDate(): Date
}

export interface FirebaseProjectDocument {
  id: string
  name: string
  slug: string
  notes?: string
  colors?: {
    primary?: string
    secondary?: string | null
  } | null
}

export interface FirebaseTagDocument {
  id: string
  name: string
  slug: string
}

export interface FirebaseTimeBoxDocument {
  id: string
  startTime: FirebaseTimestampLike
  endTime: FirebaseTimestampLike
  notes: string
  project: string
  tags: string[]
}

export interface FirebaseReportDocument {
  id: string
  title: string
  summary: string
  timezone: string
  filters: {
    dateStart: string
    dateEnd: string
    projectIds: string[]
    tagIds: string[]
    groupOperator: 'intersection' | 'union'
    tagOperator: 'any' | 'all'
  }
  shareToken: string
  createdAt: FirebaseTimestampLike | null
  updatedAt: FirebaseTimestampLike | null
  publishedAt: FirebaseTimestampLike | null
}

export interface FirebaseUserSettingsDocument {
  appearance?: {
    fontImportUrl?: string
    fontFamilies?: {
      ui?: string
      data?: string
      script?: string
    }
    backgroundPreset?: string
  }
  workflow?: {
    hideTags?: boolean
  }
}

export const toProject = (project: FirebaseProjectDocument): Project => ({
  id: project.id,
  name: project.name,
  slug: project.slug,
  notes: resolveProjectNotes(project.notes),
  colors: resolveProjectColors(project.id, project.colors),
})

export const toTag = (tag: FirebaseTagDocument): Tag => ({
  id: tag.id,
  name: tag.name,
  slug: tag.slug,
})

export const toTimeBox = (timeBox: FirebaseTimeBoxDocument): TimeBox => ({
  id: timeBox.id,
  startTime: timeBox.startTime?.toDate() ?? null,
  endTime: timeBox.endTime?.toDate() ?? null,
  notes: timeBox.notes ?? '',
  project: timeBox.project ?? '',
  tags: timeBox.tags ?? [],
})

export const toReport = (report: FirebaseReportDocument): Report => ({
  id: report.id,
  title: report.title ?? '',
  summary: report.summary ?? '',
  timezone: report.timezone ?? 'UTC',
  filters: {
    dateStart: report.filters?.dateStart ?? '',
    dateEnd: report.filters?.dateEnd ?? '',
    projectIds: report.filters?.projectIds ?? [],
    tagIds: report.filters?.tagIds ?? [],
    groupOperator: report.filters?.groupOperator ?? 'intersection',
    tagOperator: report.filters?.tagOperator ?? 'any',
  },
  shareToken: report.shareToken ?? '',
  createdAt: report.createdAt?.toDate() ?? null,
  updatedAt: report.updatedAt?.toDate() ?? null,
  publishedAt: report.publishedAt?.toDate() ?? null,
})

export const toUserSettings = (
  settings: FirebaseUserSettingsDocument | null | undefined,
): UserSettings => resolveUserSettings(settings)

export const toProjects = (projects: FirebaseProjectDocument[]) => projects.map(toProject)
export const toTags = (tags: FirebaseTagDocument[]) => tags.map(toTag)
export const toTimeBoxes = (timeBoxes: FirebaseTimeBoxDocument[]) => timeBoxes.map(toTimeBox)
export const toReports = (reports: FirebaseReportDocument[]) => reports.map(toReport)

const toTimeBoxPayload = (input: TimeBoxInput) => ({
  ...validateTimeBoxInput(input),
  startTime: Timestamp.fromDate(input.startTime),
  endTime: Timestamp.fromDate(input.endTime),
})

const toReportPayload = (input: ReportInput) => {
  const normalized = validateReportInput(input)

  return {
    title: normalized.title,
    summary: normalized.summary,
    timezone: normalized.timezone,
    filters: normalized.filters,
  }
}

export const toUserSettingsPayload = (input: UserSettings) => {
  const normalized = validateUserSettingsInput(input)

  return {
    appearance: {
      fontImportUrl: normalized.appearance.fontImportUrl,
      fontFamilies: {
        ui: normalized.appearance.fontFamilies.ui,
        data: normalized.appearance.fontFamilies.data,
        script: normalized.appearance.fontFamilies.script,
      },
      backgroundPreset: normalized.appearance.backgroundPreset,
    },
    workflow: {
      hideTags: normalized.workflow.hideTags,
    },
  }
}

export const createFirestoreWorklogRepositories = ({
  projectsCollection,
  tagsCollection,
  timeBoxesCollection,
  reportsCollection,
}: {
  projectsCollection: CollectionReference<DocumentData>
  tagsCollection: CollectionReference<DocumentData>
  timeBoxesCollection: CollectionReference<DocumentData>
  reportsCollection: CollectionReference<DocumentData>
}): WorklogRepositories => {
  const assertSlugAvailable = async (
    collection: CollectionReference<DocumentData>,
    slug: string,
    entityLabel: 'project' | 'tag',
    excludeDocumentId?: string,
  ) => {
    const snapshot = await getDocs(query(collection, where('slug', '==', slug), limit(2)))
    const conflicting = snapshot.docs.filter((document) => document.id !== excludeDocumentId)

    if (conflicting.length > 0) {
      throw createDuplicateSlugError(entityLabel)
    }
  }

  const ensureProjectIsUnused = async (projectId: string) => {
    const snapshot = await getDocs(
      query(timeBoxesCollection, where('project', '==', projectId), limit(1)),
    )

    if (!snapshot.empty) {
      throw createEntityInUseError('project')
    }
  }

  const ensureTagIsUnused = async (tagId: string) => {
    const snapshot = await getDocs(
      query(timeBoxesCollection, where('tags', 'array-contains', tagId), limit(1)),
    )

    if (!snapshot.empty) {
      throw createEntityInUseError('tag')
    }
  }

  return {
    projects: {
      async create(input) {
        const payload = createProjectPayload(input)
        await assertSlugAvailable(projectsCollection, payload.slug, 'project')

        const project = await addDoc(projectsCollection, payload)

        return project.id
      },
      async rename(id: string, name: string) {
        const projectReference = doc(projectsCollection, id)
        const snapshot = await getDoc(projectReference)
        const currentProject = toProject({
          id,
          name: String(snapshot.get('name') ?? ''),
          slug: String(snapshot.get('slug') ?? ''),
          notes: snapshot.get('notes') as string | undefined,
          colors: snapshot.get('colors') as FirebaseProjectDocument['colors'],
        })

        const payload = createProjectPayload({
          name,
          notes: currentProject.notes,
          colors: currentProject.colors,
        })

        if (payload.slug !== currentProject.slug) {
          await assertSlugAvailable(projectsCollection, payload.slug, 'project', id)
        }

        await updateDoc(projectReference, payload)
      },
      async update(id: string, input) {
        const projectReference = doc(projectsCollection, id)
        const snapshot = await getDoc(projectReference)
        const currentSlug = String(snapshot.get('slug') ?? '')
        const payload = createProjectPayload(input)

        if (payload.slug !== currentSlug) {
          await assertSlugAvailable(projectsCollection, payload.slug, 'project', id)
        }

        await updateDoc(projectReference, payload)
      },
      async remove(id: string) {
        await ensureProjectIsUnused(id)
        await deleteDoc(doc(projectsCollection, id))
      },
    },
    tags: {
      async create({ name }: { name: string }) {
        const payload = createNamedEntityPayload(name, 'Tag')
        await assertSlugAvailable(tagsCollection, payload.slug, 'tag')

        const tag = await addDoc(tagsCollection, payload)

        return tag.id
      },
      async rename(id: string, name: string) {
        const tagReference = doc(tagsCollection, id)
        const snapshot = await getDoc(tagReference)
        const currentSlug = String(snapshot.get('slug') ?? '')
        const payload = createNamedEntityPayload(name, 'Tag')

        if (payload.slug !== currentSlug) {
          await assertSlugAvailable(tagsCollection, payload.slug, 'tag', id)
        }

        await updateDoc(tagReference, payload)
      },
      async remove(id: string) {
        await ensureTagIsUnused(id)
        await deleteDoc(doc(tagsCollection, id))
      },
    },
    timeBoxes: {
      async create(input: TimeBoxInput) {
        const timeBox = await addDoc(timeBoxesCollection, toTimeBoxPayload(input))
        return timeBox.id
      },
      async update(id: string, input: TimeBoxInput) {
        await updateDoc(doc(timeBoxesCollection, id), toTimeBoxPayload(input))
      },
      async remove(id: string) {
        await deleteDoc(doc(timeBoxesCollection, id))
      },
    },
    reports: {
      async create(input: ReportInput) {
        const now = Timestamp.fromDate(new Date())
        const report = await addDoc(reportsCollection, {
          ...toReportPayload(input),
          shareToken: '',
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
        })

        return report.id
      },
      async update(id: string, input: ReportInput) {
        await updateDoc(doc(reportsCollection, id), {
          ...toReportPayload(input),
          updatedAt: Timestamp.fromDate(new Date()),
        })
      },
      async remove(id: string) {
        await deleteDoc(doc(reportsCollection, id))
      },
    },
  }
}
