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
import type { Project, Tag, TimeBox, TimeBoxInput, WorklogRepositories } from '~~/shared/worklog'
import {
  createEntityInUseError,
  createNamedEntityPayload,
  validateTimeBoxInput,
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

export const toProjects = (projects: FirebaseProjectDocument[]) => projects.map(toProject)
export const toTags = (tags: FirebaseTagDocument[]) => tags.map(toTag)
export const toTimeBoxes = (timeBoxes: FirebaseTimeBoxDocument[]) => timeBoxes.map(toTimeBox)

const toTimeBoxPayload = (input: TimeBoxInput) => ({
  ...validateTimeBoxInput(input),
  startTime: Timestamp.fromDate(input.startTime),
  endTime: Timestamp.fromDate(input.endTime),
})

export const createFirestoreWorklogRepositories = ({
  projectsCollection,
  tagsCollection,
  timeBoxesCollection,
}: {
  projectsCollection: CollectionReference<DocumentData>
  tagsCollection: CollectionReference<DocumentData>
  timeBoxesCollection: CollectionReference<DocumentData>
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
  }
}
