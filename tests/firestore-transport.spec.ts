// @vitest-environment jsdom

import { deleteApp, getApp, initializeApp } from 'firebase/app'
import { initializeFirestore, terminate } from 'firebase/firestore'

import { PHONE_MODE_TOUCH_QUERY, PHONE_MODE_VIEWPORT_QUERY } from '~/utils/phone-mode'

const firebaseConfig = { projectId: 'demo-work-log-transport', apiKey: 'test-key' }
let plugin: { enforce: string; setup: () => void }

vi.stubGlobal('defineNuxtPlugin', (definition: typeof plugin) => {
  plugin = definition
  return definition
})
vi.stubGlobal('useRuntimeConfig', () => ({ public: { vuefire: { config: firebaseConfig } } }))
await import('~/app/plugins/00.firestore-transport.client')

const setDevice = (narrow: boolean, touchFirst: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches:
      (query === PHONE_MODE_VIEWPORT_QUERY && narrow) ||
      (query === PHONE_MODE_TOUCH_QUERY && touchFirst),
  }))
}

afterEach(async () => {
  const app = getApp()
  await terminate(initializeFirestore(app, settings))
  await deleteApp(app)
})

let settings: { experimentalForceLongPolling: boolean }

describe('phone Firestore transport initialization', () => {
  it('configures long-polling before consumers and lets VueFire reuse the app', () => {
    setDevice(true, true)
    settings = { experimentalForceLongPolling: true }
    expect(plugin.enforce).toBe('pre')
    plugin.setup()

    const app = initializeApp(firebaseConfig)
    expect(app).toBe(getApp())
    expect(() => initializeFirestore(app, settings)).not.toThrow()
    expect(() => initializeFirestore(app, { experimentalForceLongPolling: false })).toThrow()
  })

  it.each([
    [false, false],
    [true, false],
    [false, true],
  ])('keeps default transport for non-phone capabilities (%s, %s)', (narrow, touchFirst) => {
    setDevice(narrow, touchFirst)
    settings = { experimentalForceLongPolling: false }
    plugin.setup()
    const app = initializeApp(firebaseConfig)
    expect(() => initializeFirestore(app, settings)).not.toThrow()
  })
})
