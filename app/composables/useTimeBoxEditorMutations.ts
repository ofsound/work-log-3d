import { ref } from 'vue'

import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useOverlayToast } from '~/composables/useOverlayToast'
import { useWorklogRepository } from '~/composables/useWorklogRepository'
import type { TimeBoxEditorProps } from '~/composables/useTimeBoxEditorModel'
import type { TimeBoxInput } from '~~/shared/worklog'
import { getWorklogErrorMessage } from '~~/shared/worklog'

export interface UseTimeBoxEditorMutationsOptions {
  emit: (event: 'saved' | 'toggleEditor', value?: string) => void
  getTimeBoxInput: () => TimeBoxInput
  props: TimeBoxEditorProps
  resetTimeBoxEditor: () => void
}

export function useTimeBoxEditorMutations(options: UseTimeBoxEditorMutationsOptions) {
  const repositories = useWorklogRepository()
  const { confirm } = useConfirmDialog()
  const { show: showOverlayToast } = useOverlayToast()

  const mutationErrorMessage = ref('')

  const clearMutationError = () => {
    mutationErrorMessage.value = ''
  }

  const updateTimeBoxDocument = async () => {
    if (!options.props.id) {
      return
    }

    const confirmed = await confirm({
      title: 'Update this session?',
      message: 'Save your changes to this time box.',
      confirmLabel: 'Update',
      variant: 'primary',
    })

    if (!confirmed) {
      clearMutationError()
      options.emit('toggleEditor')
      return
    }

    try {
      clearMutationError()
      await repositories.timeBoxes.update(options.props.id, options.getTimeBoxInput())
      options.emit('saved', options.props.id)
      options.emit('toggleEditor')
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
    }
  }

  const createTimeBoxDocument = async () => {
    try {
      clearMutationError()
      const createdId = await repositories.timeBoxes.create(options.getTimeBoxInput())

      if (options.props.resetAfterCreate) {
        void showOverlayToast({
          title: 'Session logged successfully',
          message: 'Your session was saved to the calendar.',
        })
        options.resetTimeBoxEditor()
      }

      options.emit('saved', createdId)
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save the session.')
    }
  }

  return {
    clearMutationError,
    createTimeBoxDocument,
    mutationErrorMessage,
    updateTimeBoxDocument,
  }
}
