import { ref } from 'vue'

import { useWorklogRepository } from '~/composables/useWorklogRepository'
import type { TimeBoxInput } from '~~/shared/worklog'
import { getWorklogErrorMessage } from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

export interface UseSessionsMutationsOptions {
  markCreatePreviewSaved: (sessionId: string) => void
  openSessionPanel: (
    sessionId: string,
    options?: {
      preserveCreatePreview?: boolean
      day?: Date
    },
  ) => Promise<void>
}

export function useSessionsMutations(options: UseSessionsMutationsOptions) {
  const repositories = useWorklogRepository()

  const mutationErrorMessage = ref('')

  const clearMutationError = () => {
    mutationErrorMessage.value = ''
  }

  const persistSessionChange = async ({ id, input, duplicate }: SessionChangePayload) => {
    try {
      clearMutationError()

      if (duplicate) {
        const createdId = await repositories.timeBoxes.create(input)
        await options.openSessionPanel(createdId)
        return
      }

      await repositories.timeBoxes.update(id, input)
      await options.openSessionPanel(id)
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
    }
  }

  const handlePanelCreated = async (sessionId: string) => {
    options.markCreatePreviewSaved(sessionId)
    await options.openSessionPanel(sessionId, { preserveCreatePreview: true })
  }

  return {
    clearMutationError,
    handlePanelCreated,
    mutationErrorMessage,
    persistSessionChange,
  }
}
