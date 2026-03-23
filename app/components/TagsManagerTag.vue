<script setup lang="ts">
import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { Ref } from 'vue'
import { getTagPath } from '~/utils/worklog-routes'
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getTotalDurationLabel, getWorklogErrorMessage } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps({
  name: { type: String, default: undefined },
  id: { type: String, required: true },
})

const router = useRouter()
const myInput: Ref<HTMLInputElement | null> = ref(null)
const dynamicName = ref(props.name ?? '')
const mutationErrorMessage = ref('')

const isNameEditMode = ref(false)

const deleteTagDocument = async () => {
  const confirmed = await confirm({
    title: `Delete tag “${props.name ?? props.id}”?`,
    message: 'This cannot be undone.',
    variant: 'danger',
  })

  if (confirmed) {
    try {
      await repositories.tags.remove(props.id)
      mutationErrorMessage.value = ''
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to delete tag.')
    }
  }
}

const renameTagDocument = async () => {
  try {
    await repositories.tags.rename(props.id, dynamicName.value)
    mutationErrorMessage.value = ''
    if (myInput.value) {
      isNameEditMode.value = false
      myInput.value.blur()
    }
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to rename tag.')
  }
}

const cancelRenameAndLoseFocus = () => {
  mutationErrorMessage.value = ''
  dynamicName.value = props.name ?? ''
  if (myInput.value) {
    isNameEditMode.value = false
    myInput.value.blur()
  }
}

const resetNameToSaved = () => {
  dynamicName.value = props.name ?? ''
  mutationErrorMessage.value = ''
}

const tagTimeBoxesTotalDuration = computed(() => {
  const tagTimeBoxes = toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]).filter((timeBox) =>
    timeBox.tags.some((tagId: string) => tagId === props.id),
  )

  return getTotalDurationLabel(tagTimeBoxes)
})

watch(
  () => isNameEditMode.value,
  (newValue) => {
    if (newValue && myInput.value) {
      myInput.value.focus()
    }
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="border-b border-divider py-1">
    <div class="flex gap-2">
      <input
        v-if="isNameEditMode"
        ref="myInput"
        v-model="dynamicName"
        type="text"
        class="flex-1 p-1 font-bold text-text hover:underline focus:bg-input-focus focus:no-underline!"
        @input="mutationErrorMessage = ''"
        @keyup.enter="renameTagDocument"
        @keyup.esc="cancelRenameAndLoseFocus"
        @blur="resetNameToSaved"
      />
      <button
        v-if="!isNameEditMode"
        class="flex-1 cursor-pointer p-1 text-left font-bold text-text hover:underline"
        @click="router.push(getTagPath(id))"
      >
        {{ dynamicName }}
      </button>
      <div
        class="relative top-1 mt-1.5 mb-3 ml-4 w-max cursor-pointer self-start rounded-md bg-badge-neutral px-1.5 py-0.5 pt-px font-data text-xs tracking-wide text-badge-neutral-text"
      >
        {{ tagTimeBoxesTotalDuration }} hrs total
      </div>
      <button
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        @click="isNameEditMode = !isNameEditMode"
      >
        <EditIcon />
      </button>
      <button
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        @click="deleteTagDocument"
      >
        <DeleteIcon />
      </button>
    </div>
    <p v-if="mutationErrorMessage" class="mt-2 px-1 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
