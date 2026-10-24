import { useTimeBoxEditorMutations } from '~/composables/useTimeBoxEditorMutations'
import type { TimeBoxEditorProps } from '~/composables/useTimeBoxEditorModel'

const create = vi.fn()
const update = vi.fn()
const showToast = vi.fn()
vi.mock('~/composables/useWorklogRepository', () => ({
  useWorklogRepository: () => ({ timeBoxes: { create, update } }),
}))
vi.mock('~/composables/useOverlayToast', () => ({
  useOverlayToast: () => ({ show: showToast }),
}))
const buildModel = (id?: string) => {
  const emit = vi.fn()
  const resetTimeBoxEditor = vi.fn()
  return {
    emit,
    resetTimeBoxEditor,
    ...useTimeBoxEditorMutations({
      emit,
      getTimeBoxInput: () => ({
        startTime: new Date(2026, 2, 23, 9),
        endTime: new Date(2026, 2, 23, 10),
        notes: 'Notes ',
        project: 'client',
        tags: [],
      }),
      props: { id, resetAfterCreate: true } as TimeBoxEditorProps,
      resetTimeBoxEditor,
    }),
  }
}

beforeEach(() => {
  create.mockReset()
  update.mockReset()
  showToast.mockReset()
})

it('submits only one creation for rapid Save clicks and resets only once', async () => {
  let finish!: (id: string) => void
  create.mockImplementation(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve
      }),
  )
  const model = buildModel()
  const first = model.createTimeBoxDocument()
  const second = model.createTimeBoxDocument()
  expect(model.isSaving.value).toBe(true)
  expect(create).toHaveBeenCalledTimes(1)
  finish('created-session')
  await Promise.all([first, second])
  expect(model.isSaving.value).toBe(false)
  expect(model.emit).toHaveBeenCalledExactlyOnceWith('saved', 'created-session')
  expect(model.resetTimeBoxEditor).toHaveBeenCalledTimes(1)
  expect(showToast).toHaveBeenCalledTimes(1)
})

it('guards updates while saving and permits a later intentional save', async () => {
  let finish!: () => void
  update.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const model = buildModel('existing-session')
  const first = model.updateTimeBoxDocument()
  const second = model.updateTimeBoxDocument()
  expect(update).toHaveBeenCalledTimes(1)
  expect(model.isSaving.value).toBe(true)
  finish()
  await Promise.all([first, second])
  expect(model.isSaving.value).toBe(false)
  update.mockResolvedValueOnce(undefined)
  await model.updateTimeBoxDocument()
  expect(update).toHaveBeenCalledTimes(2)
})

it('releases the saving guard after failure and preserves the draft for retry', async () => {
  create.mockRejectedValueOnce(new Error('Write failed')).mockResolvedValueOnce('retry-session')
  const model = buildModel()
  await model.createTimeBoxDocument()
  expect(model.isSaving.value).toBe(false)
  expect(model.mutationErrorMessage.value).toBeTruthy()
  expect(model.resetTimeBoxEditor).not.toHaveBeenCalled()
  await model.createTimeBoxDocument()
  expect(create).toHaveBeenCalledTimes(2)
  expect(model.emit).toHaveBeenCalledExactlyOnceWith('saved', 'retry-session')
  expect(model.mutationErrorMessage.value).toBe('')
})
