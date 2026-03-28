import { useFirestore } from 'vuefire'
import { collection, doc } from 'firebase/firestore'
import type { CollectionReference, DocumentData, DocumentReference } from 'firebase/firestore'

/**
 * Composable for Firestore db and user-scoped collection refs.
 * Refs stay null until auth resolves, so protected pages can mount without
 * forcing the layout to drop the Nuxt page outlet during SSR.
 */
export function useFirestoreCollections() {
  const db = useFirestore()
  const user = useCurrentUser()

  const uid = computed(() => user.value?.uid ?? null)
  const timeBoxesCollection = computed<CollectionReference<DocumentData> | null>(() =>
    uid.value ? collection(db, 'users', uid.value, 'timeBoxes') : null,
  )
  const projectsCollection = computed<CollectionReference<DocumentData> | null>(() =>
    uid.value ? collection(db, 'users', uid.value, 'projects') : null,
  )
  const tagsCollection = computed<CollectionReference<DocumentData> | null>(() =>
    uid.value ? collection(db, 'users', uid.value, 'tags') : null,
  )
  const dailyNotesCollection = computed<CollectionReference<DocumentData> | null>(() =>
    uid.value ? collection(db, 'users', uid.value, 'dailyNotes') : null,
  )
  const reportsCollection = computed<CollectionReference<DocumentData> | null>(() =>
    uid.value ? collection(db, 'users', uid.value, 'reports') : null,
  )
  const activeTimerDocument = computed<DocumentReference<DocumentData> | null>(() =>
    uid.value ? doc(db, 'users', uid.value, 'runtime', 'activeTimer') : null,
  )
  const settingsDocument = computed<DocumentReference<DocumentData> | null>(() =>
    uid.value ? doc(db, 'users', uid.value, 'settings', 'preferences') : null,
  )

  return {
    activeTimerDocument,
    db,
    uid,
    timeBoxesCollection,
    projectsCollection,
    tagsCollection,
    dailyNotesCollection,
    reportsCollection,
    settingsDocument,
  }
}
