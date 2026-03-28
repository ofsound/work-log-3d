import { effectScope, nextTick, ref } from 'vue'

const reportDocuments = ref([
  {
    id: 'report-1',
    title: 'Older draft',
    summary: 'Old summary',
    filters: {
      dateEnd: '2026-03-20',
      dateStart: '2026-03-01',
      groupOperator: 'intersection' as const,
      projectIds: [],
      tagIds: [],
      tagOperator: 'any' as const,
    },
    createdAt: { toDate: () => new Date('2026-03-20T18:00:00.000Z') },
    publishedAt: null,
    shareToken: '',
    updatedAt: { toDate: () => new Date('2026-03-20T18:00:00.000Z') },
  },
  {
    id: 'report-2',
    title: 'Newest draft',
    summary: 'New summary',
    filters: {
      dateEnd: '2026-03-23',
      dateStart: '2026-03-10',
      groupOperator: 'intersection' as const,
      projectIds: ['project-1'],
      tagIds: ['tag-1'],
      tagOperator: 'all' as const,
    },
    createdAt: { toDate: () => new Date('2026-03-23T18:00:00.000Z') },
    publishedAt: null,
    shareToken: '',
    updatedAt: { toDate: () => new Date('2026-03-23T18:00:00.000Z') },
  },
])

vi.mock('vuefire', () => ({
  useCollection: (source: { value?: { id?: string } } | { id?: string } | null) => {
    const resolved = source && 'value' in source ? source.value : source

    if (resolved?.id === 'projects') {
      return ref([
        {
          id: 'project-1',
          name: 'Client Portal',
          slug: 'client-portal',
          notes: '',
          colors: {
            primary: '#123456',
            secondary: '#abcdef',
          },
        },
      ])
    }

    if (resolved?.id === 'tags') {
      return ref([
        {
          id: 'tag-1',
          name: 'Deep Work',
          slug: 'deep-work',
        },
      ])
    }

    return reportDocuments
  },
}))

vi.mock('firebase/firestore', () => ({
  orderBy: vi.fn(() => ({ id: 'orderBy' })),
  query: (collection: { id?: string } | null) => collection,
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    projectsCollection: ref({ id: 'projects' }),
    reportsCollection: ref({ id: 'reports' }),
    tagsCollection: ref({ id: 'tags' }),
  }),
}))

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    hideTags: ref(false),
  }),
}))

const { useReportsDraft } = await import('~/app/composables/useReportsDraft')

describe('useReportsDraft', () => {
  it('loads the newest saved report into the draft and swaps drafts on selection change', async () => {
    const scope = effectScope()
    const state = scope.run(() => useReportsDraft())!

    await nextTick()

    expect(state.selectedReportId.value).toBe('report-2')
    expect(state.draft.value.title).toBe('Newest draft')
    expect(state.draft.value.filters.projectIds).toEqual(['project-1'])

    state.selectedReportId.value = 'report-1'
    await Promise.resolve()

    expect(state.draft.value.title).toBe('Older draft')

    state.setDraftSelection('projectIds', 'project-1', true)
    expect(state.draft.value.filters.projectIds).toEqual(['project-1'])

    scope.stop()
  })
})
