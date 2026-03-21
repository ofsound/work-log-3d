import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const getAdminApp = () => {
  const existing = getApps()[0]

  if (existing) {
    return existing
  }

  return initializeApp()
}

export const getAdminFirestore = () => getFirestore(getAdminApp())

export const getAdminAuth = () => getAuth(getAdminApp())
