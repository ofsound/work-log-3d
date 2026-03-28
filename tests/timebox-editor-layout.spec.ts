// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const hideTagsModel = vi.hoisted(() => {
  // Hoisted factories run before the module graph is ready; sync CJS is the reliable `ref` source here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Vitest hoisted + vue ref bootstrap
  const { ref: vueRef } = require('vue') as typeof import('vue')

  return vueRef(false)
})

const createProjects = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `project-${index + 1}`,
    name: `Project ${index + 1}`,
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
    },
  }))

const sortedPickerProjects = ref(createProjects(5))
const sortedAllTags = ref([
  { id: 'tag-1', name: 'Deep Work' },
  { id: 'tag-2', name: 'Review' },
])
const dynamicDuration = ref<string | number>('60')
const dynamicEndTime = ref('2026-03-23T10:00')
const dynamicNotes = ref('Worked on editor layout')
const dynamicProject = ref('project-1')
const dynamicStartTime = ref('2026-03-23T09:00')
const dynamicTags = ref(['tag-1'])
const datetimeLocalStartModel = ref('2026-03-23T09:00')
const datetimeLocalEndModel = ref('2026-03-23T10:00')
const mutationErrorMessage = ref('')

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

const resetModelState = () => {
  sortedPickerProjects.value = createProjects(5)
  sortedAllTags.value = [
    { id: 'tag-1', name: 'Deep Work' },
    { id: 'tag-2', name: 'Review' },
  ]
  dynamicDuration.value = '60'
  dynamicEndTime.value = '2026-03-23T10:00'
  dynamicNotes.value = 'Worked on editor layout'
  dynamicProject.value = 'project-1'
  dynamicStartTime.value = '2026-03-23T09:00'
  dynamicTags.value = ['tag-1']
  datetimeLocalStartModel.value = '2026-03-23T09:00'
  datetimeLocalEndModel.value = '2026-03-23T10:00'
  mutationErrorMessage.value = ''
  hideTagsModel.value = false
}

vi.mock('~/composables/useTimeBoxEditorModel', () => ({
  useTimeBoxEditorModel: () => ({
    clampHeroDragTime: (value: string) => value,
    datetimeLocalEndModel,
    datetimeLocalStartModel,
    dynamicDuration,
    dynamicDurationTypingTimer: ref<ReturnType<typeof setTimeout> | undefined>(undefined),
    dynamicEndTime,
    dynamicNotes,
    dynamicProject,
    dynamicStartTime,
    dynamicTags,
    hideTags: hideTagsModel,
    isEditingExistingTimeBox: computed(() => false),
    projectRadiosTwoColumns: computed(() => sortedPickerProjects.value.length > 4),
    resetTimeBoxEditor: vi.fn(),
    sessionTimeHero: computed(() => ({
      secondary: 'Mon, Mar 23',
    })),
    showLegacyTagNotice: computed(() => false),
    sortedAllTags,
    sortedPickerProjects,
    getTimeBoxInput: vi.fn(),
  }),
}))

vi.mock('~/composables/useTimeBoxEditorMutations', () => ({
  useTimeBoxEditorMutations: () => ({
    clearMutationError: vi.fn(),
    createTimeBoxDocument: vi.fn(),
    mutationErrorMessage,
    updateTimeBoxDocument: vi.fn(),
  }),
}))

vi.mock('~/utils/project-color-styles', () => ({
  getProjectPickerOptionStyle: () => ({}),
}))

const { default: TimeBoxEditor } = await import('~/app/components/TimeBoxEditor.vue')

const mountTimeBoxEditor = (props: Record<string, unknown> = {}) =>
  mount(TimeBoxEditor, {
    props: {
      layout: 'regular',
      surface: 'card',
      ...props,
    },
    global: {
      stubs: {
        AppButton: {
          template: '<button type="button" v-bind="$attrs"><slot /></button>',
        },
        AppField: {
          props: ['as'],
          template: '<component :is="as || \'div\'" v-bind="$attrs"><slot /></component>',
        },
        AppFieldLabel: {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
        AppTextInput: {
          template: '<input v-bind="$attrs" />',
        },
        AppTextarea: {
          template: '<textarea v-bind="$attrs"></textarea>',
        },
        AppToggleChip: {
          template: '<label v-bind="$attrs"><slot /></label>',
        },
        ContainerCard: {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
      },
    },
  })

describe('TimeBoxEditor layout classes', () => {
  beforeEach(() => {
    resetModelState()
  })

  it('uses explicit layout classes for the primary section and no longer relies on the 44rem breakpoint', () => {
    const regularWrapper = mountTimeBoxEditor({ layout: 'regular', surface: 'card' })
    const thinWrapper = mountTimeBoxEditor({ layout: 'thin', surface: 'card' })

    expect(
      regularWrapper.get('[data-testid="timebox-editor-primary-section"]').attributes('class'),
    ).toContain('flex')
    expect(
      regularWrapper.get('[data-testid="timebox-editor-primary-section"]').attributes('class'),
    ).toContain('[@container(min-width:38rem)]:grid')
    expect(
      thinWrapper.get('[data-testid="timebox-editor-primary-section"]').attributes('class'),
    ).toContain('grid-cols-[minmax(0,8rem)_minmax(0,1fr)]')
    expect(
      thinWrapper.get('[data-testid="timebox-editor-primary-section"]').attributes('class'),
    ).not.toContain('@container')
    expect(regularWrapper.html()).not.toContain('min-width:44rem')
    expect(thinWrapper.html()).not.toContain('min-width:44rem')
  })

  it('does not use a two-column primary row when tags are hidden (project-only mode)', () => {
    hideTagsModel.value = true
    const wrapper = mountTimeBoxEditor({ layout: 'regular', surface: 'card' })

    expect(
      wrapper.get('[data-testid="timebox-editor-primary-section"]').attributes('class'),
    ).not.toContain('[@container(min-width:38rem)]:grid')
  })

  it('keeps the project and tags split as the surviving 38rem width refinement', () => {
    const wrapper = mountTimeBoxEditor({ layout: 'regular', surface: 'card' })

    expect(
      wrapper.get('[data-testid="timebox-editor-project-tags-section"]').attributes('class'),
    ).toContain('[@container(min-width:38rem)]:grid')
    expect(
      wrapper.get('[data-testid="timebox-editor-tags-section"]').attributes('class'),
    ).toContain('[@container(min-width:38rem)]:border-t-0')
  })

  it('keeps the 52rem radio breakpoint only when enough projects are present', () => {
    const wideWrapper = mountTimeBoxEditor({ layout: 'regular', surface: 'card' })

    expect(
      wideWrapper.get('[data-testid="timebox-editor-project-radio-group"]').attributes('class'),
    ).toContain('[@container(min-width:52rem)]:grid-cols-2')

    sortedPickerProjects.value = createProjects(4)
    const compactWrapper = mountTimeBoxEditor({ layout: 'regular', surface: 'card' })

    expect(
      compactWrapper.get('[data-testid="timebox-editor-project-radio-group"]').attributes('class'),
    ).not.toContain('[@container(min-width:52rem)]:grid-cols-2')
  })
})
