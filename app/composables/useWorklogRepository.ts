import type { WorklogRepositories } from '~~/shared/worklog'
import { createFirestoreWorklogRepositories } from '~/utils/worklog-firebase'

export function useWorklogRepository(): WorklogRepositories {
  const {
    projectsCollection,
    tagsCollection,
    timeBoxesCollection,
    dailyNotesCollection,
    reportsCollection,
  } = useFirestoreCollections()

  const placeholderCollection = { id: '__unavailable__' } as never

  const requireCollection = <T>(value: T | null, label: string): T => {
    if (!value) {
      throw new Error(`Worklog repository requires an authenticated user for ${label}.`)
    }

    return value
  }

  const createRepositories = ({
    projects = projectsCollection.value ?? placeholderCollection,
    tags = tagsCollection.value ?? placeholderCollection,
    timeBoxes = timeBoxesCollection.value ?? placeholderCollection,
    dailyNotes = dailyNotesCollection.value ?? placeholderCollection,
    reports = reportsCollection.value ?? placeholderCollection,
  }: {
    projects?: typeof projectsCollection.value
    tags?: typeof tagsCollection.value
    timeBoxes?: typeof timeBoxesCollection.value
    dailyNotes?: typeof dailyNotesCollection.value
    reports?: typeof reportsCollection.value
  }) =>
    createFirestoreWorklogRepositories({
      projectsCollection: (projects ?? placeholderCollection) as never,
      tagsCollection: (tags ?? placeholderCollection) as never,
      timeBoxesCollection: (timeBoxes ?? placeholderCollection) as never,
      dailyNotesCollection: (dailyNotes ?? placeholderCollection) as never,
      reportsCollection: (reports ?? placeholderCollection) as never,
    })

  const repositories: WorklogRepositories = {
    projects: {
      create: (input) =>
        createRepositories({
          projects: requireCollection(projectsCollection.value, 'projects'),
        }).projects.create(input),
      rename: (id, name) =>
        createRepositories({
          projects: requireCollection(projectsCollection.value, 'projects'),
        }).projects.rename(id, name),
      update: (id, input) =>
        createRepositories({
          projects: requireCollection(projectsCollection.value, 'projects'),
        }).projects.update(id, input),
      remove: (id) =>
        createRepositories({
          projects: requireCollection(projectsCollection.value, 'projects'),
          timeBoxes: requireCollection(timeBoxesCollection.value, 'time boxes'),
        }).projects.remove(id),
    },
    tags: {
      create: (input) =>
        createRepositories({
          tags: requireCollection(tagsCollection.value, 'tags'),
        }).tags.create(input),
      rename: (id, name) =>
        createRepositories({
          tags: requireCollection(tagsCollection.value, 'tags'),
        }).tags.rename(id, name),
      remove: (id) =>
        createRepositories({
          tags: requireCollection(tagsCollection.value, 'tags'),
          timeBoxes: requireCollection(timeBoxesCollection.value, 'time boxes'),
        }).tags.remove(id),
    },
    timeBoxes: {
      create: (input) =>
        createRepositories({
          timeBoxes: requireCollection(timeBoxesCollection.value, 'time boxes'),
        }).timeBoxes.create(input),
      update: (id, input) =>
        createRepositories({
          timeBoxes: requireCollection(timeBoxesCollection.value, 'time boxes'),
        }).timeBoxes.update(id, input),
      remove: (id) =>
        createRepositories({
          timeBoxes: requireCollection(timeBoxesCollection.value, 'time boxes'),
        }).timeBoxes.remove(id),
    },
    reports: {
      create: (input) =>
        createRepositories({
          reports: requireCollection(reportsCollection.value, 'reports'),
        }).reports.create(input),
      update: (id, input) =>
        createRepositories({
          reports: requireCollection(reportsCollection.value, 'reports'),
        }).reports.update(id, input),
      remove: (id) =>
        createRepositories({
          reports: requireCollection(reportsCollection.value, 'reports'),
        }).reports.remove(id),
    },
    dailyNotes: {
      ensure: (dateKey) =>
        createRepositories({
          dailyNotes: requireCollection(dailyNotesCollection.value, 'daily notes'),
        }).dailyNotes.ensure(dateKey),
      upsert: (dateKey, input) =>
        createRepositories({
          dailyNotes: requireCollection(dailyNotesCollection.value, 'daily notes'),
        }).dailyNotes.upsert(dateKey, input),
    },
  }

  return repositories
}
