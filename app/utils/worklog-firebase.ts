import {
  Timestamp,
  addDoc,
  deleteDoc,
  doc,
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
  createEntityInUseError,
  createNamedEntityPayload,
  validateReportInput,
  validateTimeBoxInput,
  validateUserSettingsInput,
  resolveUserSettings,
} from '~~/shared/worklog'

export interface FirebaseTimestampLike {
  toDate(): Date
}

export interface FirebaseProjectDocument {
  id: string
  name: string
  slug: string
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
      async create({ name }: { name: string }) {
        const project = await addDoc(projectsCollection, createNamedEntityPayload(name, 'Project'))

        return project.id
      },
      async rename(id: string, name: string) {
        await updateDoc(doc(projectsCollection, id), createNamedEntityPayload(name, 'Project'))
      },
      async remove(id: string) {
        await ensureProjectIsUnused(id)
        await deleteDoc(doc(projectsCollection, id))
      },
    },
    tags: {
      async create({ name }: { name: string }) {
        const tag = await addDoc(tagsCollection, createNamedEntityPayload(name, 'Tag'))

        return tag.id
      },
      async rename(id: string, name: string) {
        await updateDoc(doc(tagsCollection, id), createNamedEntityPayload(name, 'Tag'))
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
