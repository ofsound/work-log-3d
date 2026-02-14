import { ensureAdminApp } from 'vuefire/server'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Returns the Firestore instance from Firebase Admin SDK.
 * Use in server routes, middleware, or server plugins.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS in .env pointing to service-account.json
 * (Firebase Console > Project Settings > Service Accounts > Generate new private key)
 */
export function useFirebaseAdminFirestore() {
  const adminApp = ensureAdminApp()
  return getFirestore(adminApp)
}
