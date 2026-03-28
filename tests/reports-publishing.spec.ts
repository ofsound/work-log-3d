import { computed, effectScope, ref } from 'vue'

const createReport = vi.fn()
const updateReport = vi.fn()

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCurrentUser: () =>
    ref({
      getIdToken: vi.fn(async () => 'token'),
    }),
  useFirebaseAuth: () => ({ id: 'auth' }),
}

vi.mock('~/app/composables/useWorklogRepository', () => ({
  useWorklogRepository: () => ({
    reports: {
      create: createReport,
      update: updateReport,
      remove: vi.fn(),
    },
    dailyNotes: {} as never,
    projects: {} as never,
    tags: {} as never,
    timeBoxes: {} as never,
  }),
}))

const { useReportsPublishing } = await import('~/app/composables/useReportsPublishing')

describe('useReportsPublishing', () => {
  beforeEach(() => {
    createReport.mockReset()
    updateReport.mockReset()
    vi.stubGlobal('$fetch', vi.fn())
  })

  it('blocks publish when the preview is invalid', async () => {
    const scope = effectScope()
    const state = scope.run(() =>
      useReportsPublishing({
        canPublish: computed(() => false),
        draft: ref({
          title: 'Draft',
          summary: '',
          filters: {
            dateStart: '2026-03-01',
            dateEnd: '2026-03-31',
            projectIds: [],
            tagIds: [],
            groupOperator: 'intersection',
            tagOperator: 'any',
          },
        }),
        selectedReport: computed(() => null),
        selectedReportId: ref(''),
        shareLink: computed(() => ''),
      }),
    )!

    await state.publishReport()

    expect(state.mutationErrorMessage.value).toBe('Resolve the report filters before publishing.')
    expect(globalThis.$fetch).not.toHaveBeenCalled()

    scope.stop()
  })
})
