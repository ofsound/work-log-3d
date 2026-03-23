import { limit, query, where } from 'firebase/firestore'

/**
 * Resolves `route.params.id` to a Firestore project document id when the segment is a slug,
 * otherwise treats it as the document id.
 */
export const useResolvedProjectDocumentId = (ssrKey: string) => {
  const { projectsCollection } = useFirestoreCollections()
  const route = useRoute()

  const requestedSegment = computed(() => {
    const p = route.params.id
    return Array.isArray(p) ? p[0] : (p ?? '')
  })

  const legacyProjectQuery = computed(() =>
    projectsCollection.value
      ? query(projectsCollection.value, where('slug', '==', requestedSegment.value), limit(1))
      : null,
  )

  const legacyProjects = useCollection(legacyProjectQuery, { ssrKey })

  const projectDocumentId = computed(() => legacyProjects.value[0]?.id ?? requestedSegment.value)

  return { projectDocumentId }
}
