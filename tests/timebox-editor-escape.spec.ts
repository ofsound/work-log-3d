// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const isDirty = ref(false)
const isEditingExistingTimeBox = ref(true)
const confirm = vi.fn()
const confirmDialogState = ref({ open: false })

;(globalThis as typeof globalThis & { computed?: typeof computed }).computed = computed
;(globalThis as typeof globalThis & { onBeforeUnmount?: typeof onBeforeUnmount }).onBeforeUnmount =
  onBeforeUnmount
;(globalThis as typeof globalThis & { onMounted?: typeof onMounted }).onMounted = onMounted
;(globalThis as typeof globalThis & { ref?: typeof ref }).ref = ref
;(
  globalThis as typeof globalThis & {
    useMinuteVerticalDrag?: () => {
      dragActive: ReturnType<typeof ref<boolean>>
      onPointerDown: ReturnType<typeof vi.fn>
    }
  }
).useMinuteVerticalDrag = () => ({
  dragActive: ref(false),
  onPointerDown: vi.fn(),
})
;(
  globalThis as typeof globalThis & {
    useConfirmDialog?: () => { confirm: typeof confirm; state: typeof confirmDialogState }
  }
).useConfirmDialog = () => ({
  confirm,
  state: confirmDialogState,
})

vi.mock('~/composables/useTimeBoxEditorModel', () => ({
  useTimeBoxEditorModel: () => ({
    clampHeroDragTime: (value: string) => value,
    datetimeLocalEndModel: ref('2026-03-23T10:00'),
    datetimeLocalStartModel: ref('2026-03-23T09:00'),
    dynamicDuration: ref<string | number>('60'),
    dynamicDurationTypingTimer: ref<ReturnType<typeof setTimeout> | undefined>(undefined),
    dynamicEndTime: ref('2026-03-23T10:00'),
    dynamicNotes: ref('Worked on the editor'),
    dynamicProject: ref('project-1'),
    dynamicStartTime: ref('2026-03-23T09:00'),
    dynamicTags: ref<string[]>([]),
    hideTags: ref(true),
    isDirty: computed(() => isDirty.value),
    isEditingExistingTimeBox: computed(() => isEditingExistingTimeBox.value),
    projectRadiosTwoColumns: computed(() => false),
    resetTimeBoxEditor: vi.fn(),
    sessionTimeHero: computed(() => null),
    showLegacyTagNotice: computed(() => false),
    sortedAllTags: ref([]),
    sortedPickerProjects: ref([]),
    getTimeBoxInput: vi.fn(),
  }),
}))

vi.mock('~/composables/useTimeBoxEditorMutations', () => ({
  useTimeBoxEditorMutations: () => ({
    clearMutationError: vi.fn(),
    createTimeBoxDocument: vi.fn(),
    mutationErrorMessage: ref(''),
    updateTimeBoxDocument: vi.fn(),
  }),
}))

vi.mock('~/utils/project-color-styles', () => ({
  getProjectPickerOptionStyle: () => ({}),
}))

const { default: TimeBoxEditor } = await import('~/app/components/TimeBoxEditor.vue')

const mountEditor = (props: Record<string, unknown> = {}) =>
  mount(TimeBoxEditor, {
    attachTo: document.body,
    props: {
      id: 'session-1',
      layout: 'thin',
      surface: 'panel',
      ...props,
    },
    global: {
      stubs: {
        AppButton: { template: '<button type="button" v-bind="$attrs"><slot /></button>' },
        AppField: {
          props: ['as'],
          template: '<component :is="as || \'div\'" v-bind="$attrs"><slot /></component>',
        },
        AppFieldLabel: { template: '<div v-bind="$attrs"><slot /></div>' },
        AppTextInput: { template: '<input v-bind="$attrs" />' },
        AppTextarea: { template: '<textarea v-bind="$attrs"></textarea>' },
        AppToggleChip: { template: '<label v-bind="$attrs"><slot /></label>' },
        ContainerCard: { template: '<div v-bind="$attrs"><slot /></div>' },
      },
    },
  })

const pressEscape = (target: EventTarget = document.body) => {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('TimeBoxEditor Escape handling', () => {
  beforeEach(() => {
    isDirty.value = false
    isEditingExistingTimeBox.value = true
    confirmDialogState.value = { open: false }
    confirm.mockReset()
  })

  it('only leaves the field when Escape is pressed while typing', async () => {
    const wrapper = mountEditor()
    const notes = wrapper.get('textarea').element as HTMLTextAreaElement
    notes.focus()

    const event = pressEscape(notes)
    await flushPromises()

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).not.toBe(notes)
    expect(wrapper.emitted('toggleEditor')).toBeUndefined()

    wrapper.unmount()
  })

  it('closes an unchanged editor and marks the key as handled for page-level listeners', async () => {
    const wrapper = mountEditor()

    const event = pressEscape()
    await flushPromises()

    expect(event.defaultPrevented).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(wrapper.emitted('toggleEditor')).toHaveLength(1)

    wrapper.unmount()
  })

  it('asks before discarding changes and keeps editing when declined', async () => {
    isDirty.value = true
    confirm.mockResolvedValue(false)
    const wrapper = mountEditor()

    pressEscape()
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Discard changes?' }))
    expect(wrapper.emitted('toggleEditor')).toBeUndefined()

    confirm.mockResolvedValue(true)
    pressEscape()
    await flushPromises()

    expect(wrapper.emitted('toggleEditor')).toHaveLength(1)

    wrapper.unmount()
  })

  it('leaves Escape to an open confirm dialog', async () => {
    confirmDialogState.value = { open: true }
    const wrapper = mountEditor()

    const event = pressEscape()
    await flushPromises()

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.emitted('toggleEditor')).toBeUndefined()

    wrapper.unmount()
  })

  it('ignores Escape on create editors that have no cancel action', async () => {
    isEditingExistingTimeBox.value = false
    const wrapper = mountEditor({ id: undefined, showCreateCancel: false })

    const event = pressEscape()
    await flushPromises()

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.emitted('toggleEditor')).toBeUndefined()

    wrapper.unmount()
  })
})
