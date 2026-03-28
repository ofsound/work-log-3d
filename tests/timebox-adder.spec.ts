// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'

import { formatToDatetimeLocal } from '~~/shared/worklog'

const projectsCollection = ref({ id: 'projects' })
const tagsCollection = ref({ id: 'tags' })
const projectDocuments = ref([
  {
    id: 'project-1',
    name: 'Client Portal',
    archived: false,
  },
])
const tagDocuments = ref([
  {
    id: 'tag-1',
    name: 'Deep Work',
  },
])

const snapshot = ref({
  mode: null as 'countup' | 'countdown' | null,
  status: 'idle' as 'idle' | 'running' | 'paused' | 'completed',
  startedAtMs: null as number | null,
  durationSeconds: null as number | null,
  originalDurationSeconds: null as number | null,
  pausedAtMs: null as number | null,
  accumulatedPauseMs: 0,
  endedAtMs: null as number | null,
  lastExtensionConsumedSeconds: 0,
  display: '00:00',
  elapsedSeconds: 0,
  remainingSeconds: null as number | null,
  completionGapSeconds: null as number | null,
  isActive: false,
})

const cancel = vi.fn().mockResolvedValue(undefined)
const scrollIntoView = vi.fn()
const timerState = ref({
  project: '',
  tags: [] as string[],
  draftNotes: '',
})

;(
  globalThis as typeof globalThis & { useRoute?: () => { query: Record<string, never> } }
).useRoute = () => ({ query: {} })
;(globalThis as typeof globalThis & { computed?: typeof computed }).computed = computed
;(globalThis as typeof globalThis & { nextTick?: typeof nextTick }).nextTick = nextTick
;(globalThis as typeof globalThis & { ref?: typeof ref }).ref = ref
;(
  globalThis as typeof globalThis & { formatToDatetimeLocal?: typeof formatToDatetimeLocal }
).formatToDatetimeLocal = formatToDatetimeLocal
;(
  globalThis as typeof globalThis & {
    useTimerService?: () => {
      snapshot: typeof snapshot
      timerState: typeof timerState
      cancel: typeof cancel
    }
  }
).useTimerService = () => ({
  snapshot,
  timerState,
  cancel,
})
;(
  globalThis as typeof globalThis & {
    useFirestoreCollections?: () => {
      projectsCollection: typeof projectsCollection
      tagsCollection: typeof tagsCollection
    }
  }
).useFirestoreCollections = () => ({
  projectsCollection,
  tagsCollection,
})
;(
  globalThis as typeof globalThis & {
    useCollection?: (source: { value?: { id?: string } } | { id?: string } | null) => unknown
  }
).useCollection = (source: { value?: { id?: string } } | { id?: string } | null) => {
  const resolved = source && 'value' in source ? source.value : source

  if (resolved?.id === 'projects') {
    return projectDocuments
  }

  if (resolved?.id === 'tags') {
    return tagDocuments
  }

  return ref([])
}

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: scrollIntoView,
  configurable: true,
})

vi.mock('~/utils/new-timebox-route-state', () => ({
  parseNewTimeBoxRoutePrefill: () => ({
    project: '',
    tags: [],
  }),
}))

vi.mock('~/utils/worklog-firebase', () => ({
  toProjects: (projects: unknown[] | undefined) => projects ?? [],
  toTags: (tags: unknown[] | undefined) => tags ?? [],
}))

const { default: TimeBoxAdder } = await import('~/app/components/TimeBoxAdder.vue')

const mountTimeBoxAdder = () =>
  mount(TimeBoxAdder, {
    global: {
      stubs: {
        CountdownTimer: { template: '<div>Countdown</div>' },
        CountupTimer: { template: '<div>Countup</div>' },
        TimeBoxEditor: {
          template: '<button data-testid="save" @click="$emit(\'saved\')">Save</button>',
        },
      },
    },
  })

const triggerSaved = async (wrapper: ReturnType<typeof mountTimeBoxAdder>) => {
  await wrapper.get('[data-testid="save"]').trigger('click')
  await Promise.resolve()
  await nextTick()
}

describe('TimeBoxAdder', () => {
  beforeEach(() => {
    snapshot.value = {
      mode: null,
      status: 'idle',
      startedAtMs: null,
      durationSeconds: null,
      originalDurationSeconds: null,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      lastExtensionConsumedSeconds: 0,
      display: '00:00',
      elapsedSeconds: 0,
      remainingSeconds: null,
      completionGapSeconds: null,
      isActive: false,
    }
    cancel.mockClear()
    cancel.mockResolvedValue(undefined)
    scrollIntoView.mockClear()
    timerState.value = {
      project: '',
      tags: [],
      draftNotes: '',
    }
  })

  it('cancels a paused countup timer after a successful save', async () => {
    snapshot.value = {
      ...snapshot.value,
      mode: 'countup',
      status: 'paused',
      startedAtMs: 0,
      pausedAtMs: 1_500_000,
      isActive: true,
    }

    const wrapper = mountTimeBoxAdder()

    await triggerSaved(wrapper)

    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('cancels a completed countdown timer after a successful save', async () => {
    snapshot.value = {
      ...snapshot.value,
      mode: 'countdown',
      status: 'completed',
      startedAtMs: 0,
      durationSeconds: 1_800,
      originalDurationSeconds: 1_800,
      endedAtMs: 1_800_000,
    }

    const wrapper = mountTimeBoxAdder()

    await triggerSaved(wrapper)

    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('does not cancel unrelated timer states after save', async () => {
    snapshot.value = {
      ...snapshot.value,
      mode: 'countdown',
      status: 'paused',
      startedAtMs: 0,
      durationSeconds: 1_800,
      originalDurationSeconds: 1_800,
      pausedAtMs: 600_000,
      isActive: true,
    }

    const wrapper = mountTimeBoxAdder()

    await triggerSaved(wrapper)

    expect(cancel).not.toHaveBeenCalled()
  })
})
