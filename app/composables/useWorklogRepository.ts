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

  const getRepositories = () => {
    if (
      !projectsCollection.value ||
      !tagsCollection.value ||
      !timeBoxesCollection.value ||
      !dailyNotesCollection.value ||
      !reportsCollection.value
    ) {
      throw new Error('Worklog repository requires an authenticated user.')
    }

    return createFirestoreWorklogRepositories({
      projectsCollection: projectsCollection.value,
      tagsCollection: tagsCollection.value,
      timeBoxesCollection: timeBoxesCollection.value,
      dailyNotesCollection: dailyNotesCollection.value,
      reportsCollection: reportsCollection.value,
    })
  }

  const repositories: WorklogRepositories = {
    projects: {
      create: (input) => getRepositories().projects.create(input),
      rename: (id, name) => getRepositories().projects.rename(id, name),
      update: (id, input) => getRepositories().projects.update(id, input),
      remove: (id) => getRepositories().projects.remove(id),
    },
    tags: {
      create: (input) => getRepositories().tags.create(input),
      rename: (id, name) => getRepositories().tags.rename(id, name),
      remove: (id) => getRepositories().tags.remove(id),
    },
    timeBoxes: {
      create: (input) => getRepositories().timeBoxes.create(input),
      update: (id, input) => getRepositories().timeBoxes.update(id, input),
      remove: (id) => getRepositories().timeBoxes.remove(id),
    },
    reports: {
      create: (input) => getRepositories().reports.create(input),
      update: (id, input) => getRepositories().reports.update(id, input),
      remove: (id) => getRepositories().reports.remove(id),
    },
    dailyNotes: {
      ensure: (dateKey) => getRepositories().dailyNotes.ensure(dateKey),
      upsert: (dateKey, input) => getRepositories().dailyNotes.upsert(dateKey, input),
    },
  }

  return repositories
}
