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
        notes: '',
        archived: false,
        colors: {
          primary: '#2563eb',
          secondary: '#06b6d4',
        },
      }),
    )
  })

  it('rejects malformed project documents', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'projects', 'project-1'), {
        name: '',
        slug: 'focus',
        notes: '',
        archived: false,
        colors: {
          primary: '#2563eb',
          secondary: null,
        },
      }),
    )
  })

  it('rejects project documents without archived field', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'projects', 'project-1'), {
        name: 'Focus',
        slug: 'focus',
        notes: '',
        colors: {
          primary: '#2563eb',
          secondary: '#06b6d4',
        },
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

  it('allows an owner to write a valid project-only timebox document', async () => {
    await assertSucceeds(
      setDoc(authedDoc(testEnvironment, 'user-1', 'timeBoxes', 'timebox-2'), {
        startTime: Timestamp.fromDate(new Date('2026-03-20T10:00:00.000Z')),
        endTime: Timestamp.fromDate(new Date('2026-03-20T11:00:00.000Z')),
        notes: 'Project-only work',
        project: 'project-1',
        tags: [],
      }),
    )
  })

  it('allows an owner to write a valid report document', async () => {
    await assertSucceeds(
      setDoc(authedDoc(testEnvironment, 'user-1', 'reports', 'report-1'), {
        title: 'March Report',
        summary: 'Client-ready summary',
        timezone: 'America/Denver',
        filters: {
          dateStart: '2026-03-01',
          dateEnd: '2026-03-21',
          projectIds: ['project-1'],
          tagIds: ['tag-1'],
          groupOperator: 'intersection',
          tagOperator: 'any',
        },
        shareToken: '',
        createdAt: Timestamp.fromDate(new Date('2026-03-21T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-21T08:00:00.000Z')),
        publishedAt: null,
      }),
    )
  })

  it('allows an owner to write a valid daily note document', async () => {
    await assertSucceeds(
      setDoc(authedDoc(testEnvironment, 'user-1', 'dailyNotes', '2026-03-23'), {
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Daily focus' }] }],
        },
        createdAt: Timestamp.fromDate(new Date('2026-03-23T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-23T09:30:00.000Z')),
      }),
    )
  })

  it('allows an owner to write valid user settings', async () => {
    await assertSucceeds(
      setDoc(authedDoc(testEnvironment, 'user-1', 'settings', 'preferences'), {
        appearance: {
          fontImportUrl:
            'https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap',
          fontFamilies: {
            ui: "'National Park', sans-serif",
            data: "'Lato', sans-serif",
          },
          backgroundPreset: 'mist',
        },
        workflow: {
          hideTags: true,
          countdownDefaultMinutes: 30,
        },
        desktop: {
          trayShortcuts: [],
        },
      }),
    )
  })

  it('rejects user settings fontFamilies that include a legacy script key', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'settings', 'preferences'), {
        appearance: {
          fontImportUrl:
            'https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap',
          fontFamilies: {
            ui: "'National Park', sans-serif",
            data: "'Lato', sans-serif",
            script: "'Anything', sans-serif",
          },
          backgroundPreset: 'mist',
        },
        workflow: {
          hideTags: true,
          countdownDefaultMinutes: 30,
        },
        desktop: {
          trayShortcuts: [],
        },
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
        tags: ['tag-1'],
      }),
    )
  })

  it('rejects malformed report documents', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'reports', 'report-1'), {
        title: '',
        summary: 'Bad report',
        timezone: '',
        filters: {
          dateStart: '',
          dateEnd: '',
          projectIds: [],
          tagIds: [],
          groupOperator: 'bad',
          tagOperator: 'any',
        },
        shareToken: '',
        createdAt: Timestamp.fromDate(new Date('2026-03-21T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-21T08:00:00.000Z')),
        publishedAt: null,
      }),
    )
  })

  it('rejects malformed daily note documents', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'dailyNotes', '2026-03-23'), {
        content: {
          type: 'paragraph',
        },
        createdAt: Timestamp.fromDate(new Date('2026-03-23T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-23T09:30:00.000Z')),
      }),
    )
  })

  it('rejects daily note documents with unexpected top-level keys', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'dailyNotes', '2026-03-23'), {
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        createdAt: Timestamp.fromDate(new Date('2026-03-23T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-23T09:30:00.000Z')),
        extra: true,
      }),
    )
  })

  it('rejects malformed user settings documents', async () => {
    await assertFails(
      setDoc(authedDoc(testEnvironment, 'user-1', 'settings', 'preferences'), {
        appearance: {
          fontImportUrl: 'https://example.com/not-google-fonts',
          fontFamilies: {
            ui: '',
            data: "'Lato', sans-serif",
          },
          backgroundPreset: 'unknown',
        },
        workflow: {
          hideTags: true,
          countdownDefaultMinutes: 30,
        },
        desktop: {
          trayShortcuts: [],
        },
      }),
    )
  })

  it('rejects writes into another user subtree', async () => {
    await assertFails(
      setDoc(authContextDoc(testEnvironment, 'user-1', 'user-2', 'projects', 'project-2'), {
        name: 'Shared',
        slug: 'shared',
        notes: '',
        archived: false,
        colors: {
          primary: '#2563eb',
          secondary: '#06b6d4',
        },
      }),
    )
  })

  it('rejects writes into another users daily note subtree', async () => {
    await assertFails(
      setDoc(authContextDoc(testEnvironment, 'user-1', 'user-2', 'dailyNotes', '2026-03-23'), {
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        createdAt: Timestamp.fromDate(new Date('2026-03-23T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-23T09:30:00.000Z')),
      }),
    )
  })
})
