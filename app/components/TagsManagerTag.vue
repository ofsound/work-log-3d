<script setup lang="ts">
import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { Ref } from 'vue'
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getTotalDurationLabel } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const shell = useHostShell()
const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps({
  name: { type: String, default: undefined },
  slug: { type: String, default: undefined },
  id: { type: String, required: true },
})

const router = useRouter()
const myInput: Ref<HTMLInputElement | null> = ref(null)
const dynamicName = ref(props.name ?? '')

const isNameEditMode = ref(false)

const deleteTagDocument = async () => {
  const confirmed = shell.confirm(`Are you sure you want to delete the tag: ${props.name}?`)

  if (confirmed) {
    try {
      await repositories.tags.remove(props.id)
    } catch (e) {
      console.error('Error deleting document: ', e)
    }
  }
}

const renameTagDocument = async () => {
  try {
    await repositories.tags.rename(props.id, dynamicName.value)
    if (myInput.value) {
      isNameEditMode.value = false
      myInput.value.blur()
    }
  } catch (e) {
    console.error('Error updating document: ', e)
  }
}

const cancelRenameAndLoseFocus = () => {
  if (myInput.value) {
    isNameEditMode.value = false
    myInput.value.blur()
  }
}

const resetNameToSaved = () => {
  dynamicName.value = props.name ?? ''
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
  <div class="flex gap-2 border-b border-black/20 py-1">
    <input
      v-if="isNameEditMode"
      ref="myInput"
      v-model="dynamicName"
      type="text"
      class="flex-1 p-1 font-bold hover:underline focus:bg-white focus:no-underline!"
      @keyup.enter="renameTagDocument"
      @keyup.esc="cancelRenameAndLoseFocus"
      @blur="resetNameToSaved"
    />
    <button
      v-if="!isNameEditMode"
      class="flex-1 cursor-pointer p-1 text-left font-bold hover:underline"
      @click="router.push(`/tag/${slug}`)"
    >
      {{ dynamicName }}
    </button>
    <button
      class="relative top-1 mt-1.5 mb-3 ml-4 w-max cursor-pointer self-start rounded-md bg-zinc-100 px-1.5 py-0.5 pt-px font-data text-xs tracking-wide text-black"
    >
      {{ tagTimeBoxesTotalDuration }} hrs total
    </button>
    <button class="cursor-pointer px-1" @click="isNameEditMode = !isNameEditMode">
      <EditIcon />
    </button>
    <button class="cursor-pointer px-1" @click="deleteTagDocument">
      <DeleteIcon />
    </button>
  </div>
</template>
