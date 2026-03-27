// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import AppButton from '~/app/components/AppButton.vue'
import AppField from '~/app/components/AppField.vue'
import AppFieldLabel from '~/app/components/AppFieldLabel.vue'
import AppTextInput from '~/app/components/AppTextInput.vue'
import AppTextarea from '~/app/components/AppTextarea.vue'
import ContainerCard from '~/app/components/ContainerCard.vue'
import WorkspaceSidebarLayout from '~/app/components/WorkspaceSidebarLayout.vue'

const createReport = vi.fn()
const updateReport = vi.fn()
const useCollectionCall = { count: 0 }

const reportDocuments = [
  {
    id: 'report-1',
    title: 'Q1 Client Report',
    summary: 'Summary',
    timezone: 'America/Denver',
    filters: {
      dateStart: '2026-03-01',
      dateEnd: '2026-03-23',
      projectIds: [],
      tagIds: [],
      groupOperator: 'intersection' as const,
      tagOperator: 'any' as const,
    },
    shareToken: '',
    createdAt: { toDate: () => new Date('2026-03-23T18:00:00.000Z') },
    updatedAt: { toDate: () => new Date('2026-03-24T18:00:00.000Z') },
    publishedAt: null,
  },
]

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCurrentUser: () => ref({ getIdToken: vi.fn(async () => 'token') }),
  useFirebaseAuth: () => ({ id: 'auth' }),
}

vi.mock('vuefire', () => ({
  useCollection: () => {
    useCollectionCall.count += 1

    if (useCollectionCall.count === 1) {
      return ref(reportDocuments)
    }

    return ref([])
  },
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    reportsCollection: ref({ id: 'reports' }),
    projectsCollection: ref({ id: 'projects' }),
    tagsCollection: ref({ id: 'tags' }),
    timeBoxesCollection: ref({ id: 'timeBoxes' }),
  }),
}))

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    hideTags: ref(true),
  }),
}))

vi.mock('~/composables/useWorklogRepository', () => ({
  useWorklogRepository: () => ({
    reports: {
      create: createReport,
      update: updateReport,
      remove: vi.fn(),
    },
    projects: {} as never,
    tags: {} as never,
    timeBoxes: {} as never,
    dailyNotes: {} as never,
  }),
}))

const { default: ReportsWorkspace } = await import('~/app/components/ReportsWorkspace.vue')

describe('ReportsWorkspace', () => {
  beforeEach(() => {
    useCollectionCall.count = 0
    createReport.mockReset()
    createReport.mockResolvedValue('report-2')
    updateReport.mockReset()
    updateReport.mockResolvedValue(undefined)
  })

  it('renders the shared left rail and primary editor actions', async () => {
    const wrapper = mount(ReportsWorkspace, {
      global: {
        components: {
          AppButton,
          AppField,
          AppFieldLabel,
          AppTextInput,
          AppTextarea,
          ContainerCard,
          WorkspaceSidebarLayout,
        },
        stubs: {
          AppFieldInlineChoice: true,
          ReportSnapshotView: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Saved drafts')
    expect(wrapper.text()).toContain('Q1 Client Report')
    expect(wrapper.text()).toContain('Report settings')
    expect(wrapper.text()).toContain('Save draft')
    expect(wrapper.text()).toContain('Publish')
  })
})
