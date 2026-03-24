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
  })

  it('routes project creation to the dedicated new project page', async () => {
    const wrapper = mount(ProjectsManager, {
      global: {
        components: {
          ContainerCard,
        },
        stubs: {
          ProjectsManagerProject: {
            props: ['project'],
            template: '<div data-test="project-row">{{ project.name }}</div>',
          },
        },
      },
    })

    expect(wrapper.find('input').exists()).toBe(false)

    await wrapper.get('button').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/project/new')
  })
})
