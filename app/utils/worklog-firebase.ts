import { Timestamp, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'

import type { CollectionReference, DocumentData } from 'firebase/firestore'
import type { Project, Tag, TimeBox, TimeBoxInput, WorklogRepositories } from '~~/shared/worklog'
import { slugifyName } from '~~/shared/worklog'

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
  startTime: Timestamp.fromDate(input.startTime),
  endTime: Timestamp.fromDate(input.endTime),
  notes: input.notes,
  project: input.project,
  tags: input.tags,
})

export const createFirestoreWorklogRepositories = ({
  projectsCollection,
  tagsCollection,
  timeBoxesCollection,
}: {
  projectsCollection: CollectionReference<DocumentData>
  tagsCollection: CollectionReference<DocumentData>
  timeBoxesCollection: CollectionReference<DocumentData>
}): WorklogRepositories => ({
  projects: {
    async create({ name }: { name: string }) {
      const project = await addDoc(projectsCollection, {
        name,
        slug: slugifyName(name),
      })

      return project.id
    },
    async rename(id: string, name: string) {
      await updateDoc(doc(projectsCollection, id), {
        name,
        slug: slugifyName(name),
      })
    },
    async remove(id: string) {
      await deleteDoc(doc(projectsCollection, id))
    },
  },
  tags: {
    async create({ name }: { name: string }) {
      const tag = await addDoc(tagsCollection, {
        name,
        slug: slugifyName(name),
      })

      return tag.id
    },
    async rename(id: string, name: string) {
      await updateDoc(doc(tagsCollection, id), {
        name,
        slug: slugifyName(name),
      })
    },
    async remove(id: string) {
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
})
