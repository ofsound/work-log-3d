// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'

const routerPush = vi.fn()
const routerReplace = vi.fn()
const mediaMatches = ref(false)

const route = reactive({
  query: {} as Record<string, string | undefined>,
})

const projectDocuments = ref([
  {
    id: 'project-1',
    name: 'Client Portal',
    slug: 'client-portal',
    notes: '',
    colors: {
      primary: '#2563eb',
      secondary: '#0e7490',
    },
  },
])

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    projectsCollection: ref({ id: 'projects' }),
  }),
}))
;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useRouter: () => ({
    push: routerPush,
    replace: (opts: { query?: Record<string, string | undefined> }) => {
      if (opts.query) {
        route.query = { ...route.query, ...opts.query }
      }
      return routerReplace(opts)
    },
  }),
  useRoute: () => route,
}

vi.mock('vuefire', () => ({
  useCollection: () => projectDocuments,
}))

vi.mock('~/composables/useMediaQuery', () => ({
  useMediaQuery: () => mediaMatches,
}))

const { default: ProjectsManager } = await import('~/app/components/ProjectsManager.vue')

const mountProjectsManager = () =>
  mount(ProjectsManager, {
    global: {
      components: {
        ContainerCard,
      },
      stubs: {
        AppButton: {
          emits: ['click'],
          template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
        },
        GridLayoutIcon: true,
        ListLayoutIcon: true,
        ProjectsManagerProject: {
          props: ['viewMode', 'project'],
          template:
            '<div data-test="project-row" :data-view-mode="viewMode">{{ project.name }}</div>',
        },
      },
    },
  })

const flushPendingWork = async () => {
  await Promise.resolve()
  await nextTick()
}

describe('projects manager', () => {
  beforeEach(() => {
    routerPush.mockReset()
    routerReplace.mockReset()
    mediaMatches.value = false
    route.query = {}
  })

  it('renders the desktop top CTA and layout toggle', () => {
    const wrapper = mountProjectsManager()

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.get('[data-testid="projects-new-project-top"]').text()).toContain('New Project')
    expect(wrapper.find('[data-testid="projects-new-project-bottom"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="projects-layout-toggle"]').exists()).toBe(true)
  })

  it('routes desktop project creation to the dedicated new project page', async () => {
    const wrapper = mountProjectsManager()

    await wrapper.get('[data-testid="projects-new-project-top"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/project/new')
  })

  it('forces mobile view to list, hides the toggle, and renders only the bottom CTA', async () => {
    mediaMatches.value = true
    route.query = { view: 'grid' }

    const wrapper = mountProjectsManager()
    await flushPendingWork()

    expect(routerReplace).toHaveBeenCalledWith({ query: { view: 'list' } })
    expect(route.query).toEqual({ view: 'list' })
    expect(wrapper.find('[data-testid="projects-layout-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="projects-new-project-top"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="projects-new-project-bottom"]').text()).toContain(
      'New Project',
    )
    expect(wrapper.get('[data-test="project-row"]').attributes('data-view-mode')).toBe('list')

    await wrapper.get('[data-testid="projects-new-project-bottom"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/project/new')
  })
})
