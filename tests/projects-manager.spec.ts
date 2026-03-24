// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'

const routerPush = vi.fn()
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

const layoutRef = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ref } = require('vue') as typeof import('vue')
  return ref<'list' | 'grid'>('list')
})

vi.mock('~/composables/useProjectsPageLayout', () => ({
  useProjectsPageLayout: () => ({
    layout: layoutRef,
    setLayout: (next: 'list' | 'grid') => {
      layoutRef.value = next
    },
  }),
}))
;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useRouter: () => ({ push: routerPush }),
}

vi.mock('vuefire', () => ({
  useCollection: () => projectDocuments,
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    projectsCollection: ref({ id: 'projects' }),
  }),
}))

const { default: ProjectsManager } = await import('~/app/components/ProjectsManager.vue')

describe('projects manager', () => {
  beforeEach(() => {
    routerPush.mockReset()
    layoutRef.value = 'list'
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
            props: ['layout', 'project'],
            template: '<div data-test="project-row">{{ project.name }}</div>',
          },
        },
      },
    })

    expect(wrapper.find('input').exists()).toBe(false)

    await wrapper.get('[aria-label="Create project"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/project/new')
  })
})
