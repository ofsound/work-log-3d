// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, ref } from 'vue'

import { formatToDatetimeLocal } from '~~/shared/worklog'

const projectsCollection = ref({ id: 'projects' })
const tagsCollection = ref({ id: 'tags' })
const timeBoxesCollection = ref({ id: 'timeBoxes' })
const timeBoxDocumentData = ref<unknown>(null)

const projectDocuments = ref([
  {
    id: 'project-1',
    name: 'Client Portal',
    slug: 'client-portal',
    notes: '',
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
    },
  },
])

const tagDocuments = ref([
  {
    id: 'tag-1',
    name: 'Deep Work',
    slug: 'deep-work',
  },
])

vi.mock('vuefire', () => ({
  useCollection: (source: { value?: { id?: string } } | { id?: string } | null) => {
    const resolved = source && 'value' in source ? source.value : source

    if (resolved?.id === 'projects') {
      return projectDocuments
    }

    if (resolved?.id === 'tags') {
      return tagDocuments
    }

    return ref([])
  },
  useDocument: () => ({
    data: timeBoxDocumentData,
  }),
}))

vi.mock('firebase/firestore', () => ({
  doc: (_collection: unknown, id: string) => ({
    id,
  }),
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    projectsCollection,
    tagsCollection,
    timeBoxesCollection,
  }),
}))

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    hideTags: ref(false),
  }),
}))

const { useTimeBoxEditorModel } = await import('~/app/composables/useTimeBoxEditorModel')

const createBaseProps = () => ({
  createButtonLabel: 'Log Session',
  embeddedInPanel: false,
  endTimeFromTimer: undefined,
  id: undefined,
  initialEndTime: undefined,
  initialNotes: '',
  initialProject: '',
  initialStartTime: undefined,
  initialTags: [] as string[],
  resetAfterCreate: true,
  showCreateCancel: false,
  startTimeFromTimer: undefined,
})

const mountHarness = (propsOverrides: Partial<ReturnType<typeof createBaseProps>> = {}) => {
  let state: ReturnType<typeof useTimeBoxEditorModel> | null = null

  const props = reactive({
    ...createBaseProps(),
    ...propsOverrides,
  })
  const clearMutationError = vi.fn()

  const Harness = defineComponent({
    setup() {
      state = useTimeBoxEditorModel({
        clearMutationError,
        props,
      })

      return () => null
    },
  })

  return {
    clearMutationError,
    props,
    wrapper: mount(Harness),
    getState: () => state!,
  }
}

describe('useTimeBoxEditorModel', () => {
  beforeEach(() => {
    timeBoxDocumentData.value = null
  })

  it('keeps duration and end-time state in sync for create flows', async () => {
    const start = new Date(2026, 2, 23, 9, 0)
    const end = new Date(2026, 2, 23, 10, 0)
    const { clearMutationError, props, wrapper, getState } = mountHarness({
      initialEndTime: formatToDatetimeLocal(end),
      initialNotes: 'Planning',
      initialProject: 'project-1',
      initialStartTime: formatToDatetimeLocal(start),
      initialTags: ['tag-1'],
    })
    const state = getState()

    expect(state.dynamicDuration.value).toBe(60)
    expect(state.dynamicProject.value).toBe('project-1')
    expect(state.dynamicTags.value).toEqual(['tag-1'])

    state.dynamicDuration.value = 90
    await nextTick()

    expect(state.dynamicEndTime.value).toBe(formatToDatetimeLocal(new Date(2026, 2, 23, 10, 30)))

    props.endTimeFromTimer = formatToDatetimeLocal(new Date(2026, 2, 23, 11, 0))
    await nextTick()

    expect(state.dynamicEndTime.value).toBe(formatToDatetimeLocal(new Date(2026, 2, 23, 11, 0)))
    expect(clearMutationError).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('hydrates edit flows from the bound document and marks the editor as editing', async () => {
    timeBoxDocumentData.value = {
      id: 'session-1',
      notes: 'Hydrated notes',
      project: 'project-1',
      startTime: { toDate: () => new Date(2026, 2, 23, 13, 0) },
      endTime: { toDate: () => new Date(2026, 2, 23, 14, 30) },
      tags: ['tag-1'],
    }

    const { clearMutationError, wrapper, getState } = mountHarness({
      id: 'session-1',
    })
    const state = getState()

    await nextTick()

    expect(state.isEditingExistingTimeBox.value).toBe(true)
    expect(state.dynamicNotes.value).toBe('Hydrated notes')
    expect(state.dynamicStartTime.value).toBe(formatToDatetimeLocal(new Date(2026, 2, 23, 13, 0)))
    expect(state.dynamicEndTime.value).toBe(formatToDatetimeLocal(new Date(2026, 2, 23, 14, 30)))
    expect(state.dynamicTags.value).toEqual(['tag-1'])
    expect(clearMutationError).toHaveBeenCalled()

    wrapper.unmount()
  })
})
