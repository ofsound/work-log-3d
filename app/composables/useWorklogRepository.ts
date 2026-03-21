import { createFirestoreWorklogRepositories } from '~/utils/worklog-firebase'

export function useWorklogRepository() {
  const { projectsCollection, tagsCollection, timeBoxesCollection, reportsCollection } =
    useFirestoreCollections()

  return createFirestoreWorklogRepositories({
    projectsCollection,
    tagsCollection,
    timeBoxesCollection,
    reportsCollection,
  })
}
