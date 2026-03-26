<script setup lang="ts">
import type { Ref } from 'vue'

import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import { APP_TOGGLE_CHIP_UNSELECTED_CLASS_NAME } from '~/utils/app-field'
import { toTimeBoxes, type FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { getTotalDurationRoundedHoursLabel, getWorklogErrorMessage } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps({
  name: { type: String, default: undefined },
  id: { type: String, required: true },
  slug: { type: String, default: '' },
})

const myInput: Ref<HTMLInputElement | null> = ref(null)
const dynamicName = ref(props.name ?? '')
const mutationErrorMessage = ref('')

const isNameEditMode = ref(false)

const chipRowClass = computed(() => [
  APP_TOGGLE_CHIP_UNSELECTED_CLASS_NAME,
  'w-full min-w-0 justify-between',
])

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

  return getTotalDurationRoundedHoursLabel(tagTimeBoxes)
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
  <div>
    <div :class="chipRowClass">
      <div v-if="isNameEditMode" class="flex min-h-11 min-w-0 flex-1 items-center gap-3">
        <input
          ref="myInput"
          v-model="dynamicName"
          type="text"
          class="min-w-0 flex-1 bg-transparent font-bold text-text outline-none focus:ring-0"
          @input="mutationErrorMessage = ''"
          @keyup.enter="renameTagDocument"
          @keyup.esc="cancelRenameAndLoseFocus"
          @blur="resetNameToSaved"
        />
        <span
          class="shrink-0 rounded-full border border-border px-1.5 py-px text-[10px] leading-none font-semibold text-text tabular-nums"
        >
          {{ tagTimeBoxesTotalDuration }} hrs
        </span>
      </div>
      <div v-else class="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left text-text">
        <span class="min-w-0 truncate font-bold">{{ dynamicName }}</span>
        <span
          class="shrink-0 rounded-full border border-border px-1.5 py-px text-[10px] leading-none font-semibold text-text tabular-nums"
        >
          {{ tagTimeBoxesTotalDuration }} hrs
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          class="cursor-pointer px-1 text-text-subtle hover:text-text"
          :aria-label="`Rename tag ${dynamicName}`"
          @click="isNameEditMode = !isNameEditMode"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          class="cursor-pointer px-1 text-text-subtle hover:text-text"
          :aria-label="`Delete tag ${dynamicName}`"
          @click="deleteTagDocument"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
    <p v-if="mutationErrorMessage" class="mt-2 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
