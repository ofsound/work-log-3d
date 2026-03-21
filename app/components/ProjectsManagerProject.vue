<script setup lang="ts">
import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { Ref } from 'vue'
import { getProjectPath } from '~/utils/worklog-routes'
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getTotalDurationLabel, getWorklogErrorMessage } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const shell = useHostShell()
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

const deleteProjectDocument = async () => {
  const confirmed = shell.confirm(`Are you sure you want to delete the project: ${props.name}?`)

  if (confirmed) {
    try {
      await repositories.projects.remove(props.id)
      mutationErrorMessage.value = ''
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to delete project.')
    }
  }
}

const renameProjectDocument = async () => {
  try {
    await repositories.projects.rename(props.id, dynamicName.value)
    mutationErrorMessage.value = ''
    if (myInput.value) {
      myInput.value.blur()
      isNameEditMode.value = false
    }
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to rename project.')
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

const handleBlur = () => {
  dynamicName.value = props.name ?? ''
  mutationErrorMessage.value = ''
}

const projectTimeBoxesTotalDuration = computed(() => {
  const projectTimeBoxes = toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]).filter(
    (timeBox: { project: string }) => timeBox.project === props.id,
  )

  return getTotalDurationLabel(projectTimeBoxes)
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
  <div class="border-b border-black/20 py-1">
    <div class="flex gap-2">
      <input
        v-if="isNameEditMode"
        ref="myInput"
        v-model="dynamicName"
        type="text"
        class="flex-1 p-1 font-bold hover:underline focus:bg-white focus:no-underline!"
        @input="mutationErrorMessage = ''"
        @keyup.enter="renameProjectDocument"
        @keyup.esc="cancelRenameAndLoseFocus"
        @blur="handleBlur"
      />
      <button
        v-if="!isNameEditMode"
        class="flex-1 cursor-pointer p-1 text-left font-bold hover:underline"
        @click="router.push(getProjectPath(id))"
      >
        {{ dynamicName }}
      </button>
      <div
        class="relative top-1 mt-1.5 mb-3 ml-4 w-max cursor-pointer self-start rounded-md bg-zinc-100 px-1.5 py-0.5 pt-px font-data text-xs tracking-wide text-black"
      >
        {{ projectTimeBoxesTotalDuration }} hrs
      </div>
      <button class="cursor-pointer px-1" @click="isNameEditMode = !isNameEditMode">
        <EditIcon />
      </button>
      <button class="cursor-pointer px-1" @click="deleteProjectDocument">
        <DeleteIcon />
      </button>
    </div>
    <p v-if="mutationErrorMessage" class="mt-2 px-1 text-sm text-red-700">
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
