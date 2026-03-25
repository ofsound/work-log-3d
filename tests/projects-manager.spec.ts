// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'

const routerPush = vi.fn()
const routerReplace = vi.fn()

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
      secondary: '#06b6d4',
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

const { default: ProjectsManager } = await import('~/app/components/ProjectsManager.vue')

describe('projects manager', () => {
  beforeEach(() => {
    routerPush.mockReset()
    routerReplace.mockReset()
    route.query = {}
  })

  it('routes project creation to the dedicated new project page', async () => {
    const wrapper = mount(ProjectsManager, {
      global: {
        components: {
          ContainerCard,
        },
        stubs: {
          GridLayoutIcon: true,
          ListLayoutIcon: true,
          ProjectsManagerProject: {
            props: ['viewMode', 'project'],
            template: '<div data-test="project-row">{{ project.name }}</div>',
          },
        },
      },
    })

    expect(wrapper.find('input').exists()).toBe(false)

    await wrapper.get('[aria-label="New project"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/project/new')
  })
})
