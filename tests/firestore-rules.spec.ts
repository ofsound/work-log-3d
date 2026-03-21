import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { Timestamp, doc, setDoc } from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest'

const projectId = 'demo-work-log'
const firestoreRules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')

const authedDoc = (
  testEnvironment: Awaited<ReturnType<typeof initializeTestEnvironment>>,
  uid: string,
  ...segments: string[]
) => doc(testEnvironment.authenticatedContext(uid).firestore(), 'users', uid, ...segments)

const authContextDoc = (
  testEnvironment: Awaited<ReturnType<typeof initializeTestEnvironment>>,
  authUid: string,
  pathUid: string,
  ...segments: string[]
) => doc(testEnvironment.authenticatedContext(authUid).firestore(), 'users', pathUid, ...segments)

describe('firestore rules', () => {
  let testEnvironment: Awaited<ReturnType<typeof initializeTestEnvironment>>

  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: firestoreRules,
        host: '127.0.0.1',
        port: 8080,
      },
    })
  })

  afterEach(async () => {
    if (testEnvironment) {
      await testEnvironment.clearFirestore()
    }
  })

  afterAll(async () => {
    if (testEnvironment) {
      await testEnvironment.cleanup()
    }
  })

  it('allows an owner to write a valid project document', async () => {
    await assertSucceeds(
      setDoc(authedDoc(testEnvironment, 'user-1', 'projects', 'project-1'), {
        name: 'Focus',
        slug: 'focus',
      }),
    )
  })

  it('rejects malformed project documents', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'projects', 'project-1'), {
        name: '',
      }),
    )
  })

  it('allows an owner to write a valid timebox document', async () => {
    await assertSucceeds(
      setDoc(authedDoc(testEnvironment, 'user-1', 'timeBoxes', 'timebox-1'), {
        startTime: Timestamp.fromDate(new Date('2026-03-20T08:00:00.000Z')),
        endTime: Timestamp.fromDate(new Date('2026-03-20T09:00:00.000Z')),
        notes: 'Deep work',
        project: 'project-1',
        tags: ['tag-1'],
      }),
    )
  })

  it('rejects malformed timebox documents', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'timeBoxes', 'timebox-1'), {
        startTime: Timestamp.fromDate(new Date('2026-03-20T09:00:00.000Z')),
        endTime: Timestamp.fromDate(new Date('2026-03-20T08:00:00.000Z')),
        notes: '',
        project: '',
        tags: [],
      }),
    )
  })

  it('rejects writes into another user subtree', async () => {
    await assertFails(
      setDoc(authContextDoc(testEnvironment, 'user-1', 'user-2', 'projects', 'project-2'), {
        name: 'Shared',
        slug: 'shared',
      }),
    )
  })
})
