import { useFirestore } from 'vuefire'
import { collection } from 'firebase/firestore'

/**
 * Composable for Firestore db and user-scoped collection refs.
 * Requires authenticated user; use only on protected routes.
 * Layout guard ensures user exists before this runs.
 */
export function useFirestoreCollections() {
  const db = useFirestore()
  const user = useCurrentUser()

  const uid = user.value?.uid
  if (!uid) {
    throw new Error('useFirestoreCollections requires authenticated user')
  }

  return {
    db,
    uid,
    timeBoxesCollection: collection(db, 'users', uid, 'timeBoxes'),
    projectsCollection: collection(db, 'users', uid, 'projects'),
    tagsCollection: collection(db, 'users', uid, 'tags'),
    reportsCollection: collection(db, 'users', uid, 'reports'),
  }
}
