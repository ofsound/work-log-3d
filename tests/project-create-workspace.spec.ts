// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

import { getProjectDefaultMetadata } from '../shared/worklog'

const routerPush = vi.fn()
const createProject = vi.fn()
const confirm = vi.fn()
const getDocs = vi.fn()

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  onBeforeRouteLeave: () => {},
  useRouter: () => ({ push: routerPush }),
}

vi.mock('firebase/firestore', () => ({
  getDocs,
}))

vi.mock('~/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm,
  }),
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    projectsCollection: ref({ id: 'projects' }),
  }),
}))

vi.mock('~/composables/useWorklogRepository', () => ({
  useWorklogRepository: () => ({
    projects: {
      create: createProject,
    },
  }),
}))

const flushPendingWork = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const { default: ProjectCreateWorkspace } =
  await import('~/app/components/ProjectCreateWorkspace.vue')

describe('project create workspace', () => {
  beforeEach(() => {
    routerPush.mockReset()
    routerPush.mockResolvedValue(undefined)
    createProject.mockReset()
    createProject.mockResolvedValue('project-9')
    confirm.mockReset()
    confirm.mockResolvedValue(true)
    getDocs.mockReset()
    getDocs.mockResolvedValue({ size: 3 })
  })

  it('renders a create-specific header without workspace tabs', async () => {
    const wrapper = mount(ProjectCreateWorkspace, {
      global: {
        stubs: {
          ProjectEditorFormLayout: {
            props: ['heading', 'submitLabel'],
            template: `
              <div>
                <div data-test="heading">{{ heading }}</div>
                <div data-test="submit-label">{{ submitLabel }}</div>
              </div>
            `,
          },
          ProjectWorkspaceHeader: {
            props: ['tabs', 'title'],
            template: '<div data-test="header" :data-title="title" :data-tabs="tabs.length"></div>',
          },
        },
      },
    })

    await flushPendingWork()

    expect(wrapper.get('[data-test="heading"]').text()).toBe('Create project')
    expect(wrapper.get('[data-test="submit-label"]').text()).toBe('Create project')
    expect(wrapper.get('[data-test="header"]').attributes('data-title')).toBe('New project')
    expect(wrapper.get('[data-test="header"]').attributes('data-tabs')).toBe('0')
  })

  it('creates a project and redirects to its overview route', async () => {
    getDocs.mockResolvedValue({ size: 4 })

    const wrapper = mount(ProjectCreateWorkspace, {
      global: {
        stubs: {
          ProjectEditorFormLayout: {
            props: ['heading'],
            emits: ['cancel', 'save', 'update:name'],
            template: `
              <div>
                <div data-test="heading">{{ heading }}</div>
                <button data-test="set-name" @click="$emit('update:name', ' Client Portal ')"></button>
                <button data-test="save" @click="$emit('save')"></button>
                <button data-test="cancel" @click="$emit('cancel')"></button>
              </div>
            `,
          },
          ProjectWorkspaceHeader: {
            props: ['tabs', 'title'],
            template: '<div data-test="header" :data-title="title" :data-tabs="tabs.length"></div>',
          },
        },
      },
    })

    await flushPendingWork()
    await wrapper.get('[data-test="set-name"]').trigger('click')
    await wrapper.get('[data-test="save"]').trigger('click')
    await flushPendingWork()

    expect(createProject).toHaveBeenCalledWith({
      name: ' Client Portal ',
      notes: '',
      colors: getProjectDefaultMetadata(4).colors,
      archived: false,
    })
    expect(routerPush).toHaveBeenCalledWith('/project/client-portal')
  })

  it('cancels back to the projects list when no draft changes exist', async () => {
    const wrapper = mount(ProjectCreateWorkspace, {
      global: {
        stubs: {
          ProjectEditorFormLayout: {
            emits: ['cancel'],
            template: '<button data-test="cancel" @click="$emit(\'cancel\')"></button>',
          },
          ProjectWorkspaceHeader: {
            props: ['tabs', 'title'],
            template: '<div data-test="header" :data-title="title" :data-tabs="tabs.length"></div>',
          },
        },
      },
    })

    await flushPendingWork()
    await wrapper.get('[data-test="cancel"]').trigger('click')

    expect(confirm).not.toHaveBeenCalled()
    expect(routerPush).toHaveBeenCalledWith('/projects')
  })
})
