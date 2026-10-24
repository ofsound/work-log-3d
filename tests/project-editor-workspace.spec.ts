// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

const routerPush = vi.fn()
const confirm = vi.fn()
const updateProject = vi.fn()
const removeProject = vi.fn()

const route = reactive({
  params: {
    id: 'client-portal',
  },
  query: {} as Record<string, string | undefined>,
})

const projectDocument = ref({
  id: 'project-1',
  name: 'Client Portal',
  slug: 'client-portal',
  notes: 'Private notes',
  archived: false,
  colors: {
    primary: '#2563eb',
    secondary: '#0e7490',
  },
})

const projectTimeBoxes = ref([] as Array<unknown>)

;(globalThis as typeof globalThis & { computed?: typeof computed }).computed = computed
;(globalThis as typeof globalThis & { onBeforeUnmount?: typeof onBeforeUnmount }).onBeforeUnmount =
  onBeforeUnmount
;(globalThis as typeof globalThis & { onMounted?: typeof onMounted }).onMounted = onMounted
;(globalThis as typeof globalThis & { ref?: typeof ref }).ref = ref
;(globalThis as typeof globalThis & { useRoute?: () => typeof route }).useRoute = () => route
;(globalThis as typeof globalThis & { useRouter?: () => { push: typeof routerPush } }).useRouter =
  () => ({ push: routerPush })
;(globalThis as typeof globalThis & { watch?: typeof watch }).watch = watch
;(
  globalThis as typeof globalThis & { onBeforeRouteLeave?: (guard: unknown) => unknown }
).onBeforeRouteLeave = () => {}
;(
  globalThis as typeof globalThis & { useCollection?: () => typeof projectTimeBoxes }
).useCollection = () => projectTimeBoxes
;(globalThis as typeof globalThis & { useDocument?: () => typeof projectDocument }).useDocument =
  () => projectDocument
;(
  globalThis as typeof globalThis & {
    useConfirmDialog?: () => { confirm: typeof confirm }
  }
).useConfirmDialog = () => ({
  confirm,
})
;(
  globalThis as typeof globalThis & {
    useFirestoreCollections?: () => {
      projectsCollection: ReturnType<typeof ref<{ id: string }>>
      timeBoxesCollection: ReturnType<typeof ref<{ id: string }>>
    }
  }
).useFirestoreCollections = () => ({
  projectsCollection: ref({ id: 'projects' }),
  timeBoxesCollection: ref({ id: 'timeBoxes' }),
})
;(
  globalThis as typeof globalThis & {
    useWorklogRepository?: () => {
      projects: {
        remove: typeof removeProject
        update: typeof updateProject
      }
    }
  }
).useWorklogRepository = () => ({
  projects: {
    remove: removeProject,
    update: updateProject,
  },
})
;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  onBeforeRouteLeave: () => {},
  useRoute: () => route,
  useRouter: () => ({ push: routerPush }),
}

vi.mock('firebase/firestore', () => ({
  doc: (_collection: unknown, id: string) => ({ id }),
  query: (...parts: unknown[]) => ({ parts }),
  where: (...parts: unknown[]) => ({ parts }),
}))

const { default: ProjectEditorWorkspace } =
  await import('~/app/components/ProjectEditorWorkspace.vue')

const mountProjectEditor = () =>
  mount(ProjectEditorWorkspace, {
    props: {
      id: 'project-1',
    },
    global: {
      stubs: {
        AppButton: {
          template: '<button type="button" v-bind="$attrs"><slot /></button>',
        },
        ContainerCard: {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
        ProjectEditorFormLayout: {
          name: 'ProjectEditorFormLayout',
          props: ['showInlineActions'],
          template:
            '<div data-test="project-editor-form-layout" :data-show-inline-actions="String(showInlineActions)" />',
        },
        ProjectWorkspaceHeader: {
          name: 'ProjectWorkspaceHeader',
          props: ['errorMessage'],
          template: '<div data-test="project-workspace-header" />',
        },
      },
    },
  })

describe('ProjectEditorWorkspace', () => {
  beforeEach(() => {
    routerPush.mockReset()
    confirm.mockReset()
    confirm.mockResolvedValue(true)
    updateProject.mockReset()
    updateProject.mockResolvedValue(undefined)
    removeProject.mockReset()
    removeProject.mockResolvedValue(undefined)
    route.params.id = 'client-portal'
    route.query = {}
    projectDocument.value = {
      id: 'project-1',
      name: 'Client Portal',
      slug: 'client-portal',
      notes: 'Private notes',
      archived: false,
      colors: {
        primary: '#2563eb',
        secondary: '#0e7490',
      },
    }
    projectTimeBoxes.value = []
  })

  it('renders a persistent footer and disables inline form actions in edit mode', () => {
    const wrapper = mountProjectEditor()

    expect(wrapper.find('[data-test="project-editor-scroll-region"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="project-editor-footer"]').text()).toContain('Cancel')
    expect(wrapper.get('[data-test="project-editor-footer"]').text()).toContain('Save project')
    expect(
      wrapper
        .get('[data-test="project-editor-form-layout"]')
        .attributes('data-show-inline-actions'),
    ).toBe('false')
  })
  it('navigates to the new slug after rename even before the document echo arrives', async () => {
    route.query = { mode: 'calendar', date: '2026-03-23' }
    const wrapper = mountProjectEditor()
    wrapper
      .getComponent({ name: 'ProjectEditorFormLayout' })
      .vm.$emit('update:name', 'Renamed Portal')
    await nextTick()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save project')!
      .trigger('click')
    await flushPromises()
    expect(updateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ name: 'Renamed Portal' }),
    )
    expect(routerPush).toHaveBeenCalledWith({
      path: '/project/renamed-portal',
      query: { mode: 'calendar', date: '2026-03-23' },
    })
    wrapper.unmount()
  })

  it('keeps the saved slug when the old route stops resolving during the write', async () => {
    const wrapper = mountProjectEditor()
    updateProject.mockImplementation(async () => {
      projectDocument.value = {
        ...projectDocument.value,
        name: 'Renamed Portal',
        slug: 'renamed-portal',
      }
      await wrapper.setProps({ id: 'client-portal' })
    })
    wrapper
      .getComponent({ name: 'ProjectEditorFormLayout' })
      .vm.$emit('update:name', 'Renamed Portal')
    await nextTick()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save project')!
      .trigger('click')
    await flushPromises()
    expect(updateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ name: 'Renamed Portal' }),
    )
    expect(routerPush).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/project/renamed-portal' }),
    )
    wrapper.unmount()
  })

  it('stays in the editor when saving fails', async () => {
    const wrapper = mountProjectEditor()
    updateProject.mockRejectedValue(new Error('Write failed'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save project')!
      .trigger('click')
    await flushPromises()
    expect(routerPush).not.toHaveBeenCalled()
    expect(wrapper.getComponent({ name: 'ProjectWorkspaceHeader' }).props('errorMessage')).toBe(
      'Unable to save project details.',
    )
    wrapper.unmount()
  })
})
