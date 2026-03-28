// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

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
    const wrapper = mount(ProjectEditorWorkspace, {
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
            props: ['showInlineActions'],
            template:
              '<div data-test="project-editor-form-layout" :data-show-inline-actions="String(showInlineActions)" />',
          },
          ProjectWorkspaceHeader: {
            template: '<div data-test="project-workspace-header" />',
          },
        },
      },
    })

    expect(wrapper.find('[data-test="project-editor-scroll-region"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="project-editor-footer"]').text()).toContain('Cancel')
    expect(wrapper.get('[data-test="project-editor-footer"]').text()).toContain('Save project')
    expect(
      wrapper
        .get('[data-test="project-editor-form-layout"]')
        .attributes('data-show-inline-actions'),
    ).toBe('false')
  })
})
