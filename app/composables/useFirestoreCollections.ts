import { useFirestore } from 'vuefire'
import { collection } from 'firebase/firestore'

/**
 * Composable for Firestore db and collection refs.
 * Must be called within component setup or another composable.
 */
export function useFirestoreCollections() {
  const db = useFirestore()
  return {
    db,
    timeBoxesCollection: collection(db, 'timeBoxes'),
    projectsCollection: collection(db, 'projects'),
    tagsCollection: collection(db, 'tags'),
  }
}
