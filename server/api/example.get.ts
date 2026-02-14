import { useFirebaseAdminFirestore } from '../utils/firebaseAdmin'

/**
 * Example server API route using Firebase Admin SDK.
 * GET /api/example - returns count of timeBoxes (server-side Firestore read)
 */
export default defineEventHandler(async () => {
  const db = useFirebaseAdminFirestore()
  const snapshot = await db.collection('timeBoxes').count().get()
  return { count: snapshot.data().count }
})
