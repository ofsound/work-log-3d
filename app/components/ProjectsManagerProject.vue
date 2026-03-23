<script setup lang="ts">
import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { Ref } from 'vue'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import { getProjectEditPath, getProjectPath } from '~/utils/worklog-routes'
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import type { Project } from '~~/shared/worklog'
import { getTotalDurationLabel, getWorklogErrorMessage } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps<{
  project: Project
}>()

const router = useRouter()
const myInput: Ref<HTMLInputElement | null> = ref(null)
const dynamicName = ref(props.project.name)
const mutationErrorMessage = ref('')

const isNameEditMode = ref(false)

const deleteProjectDocument = async () => {
  const confirmed = await confirm({
    title: `Delete project “${props.project.name}”?`,
    message: 'This cannot be undone.',
    variant: 'danger',
  })

  if (confirmed) {
    try {
      await repositories.projects.remove(props.project.id)
      mutationErrorMessage.value = ''
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to delete project.')
    }
  }
}

const renameProjectDocument = async () => {
  try {
    await repositories.projects.rename(props.project.id, dynamicName.value)
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
  dynamicName.value = props.project.name
  if (myInput.value) {
    isNameEditMode.value = false
    myInput.value.blur()
  }
}

const handleBlur = () => {
  dynamicName.value = props.project.name
  mutationErrorMessage.value = ''
}

const projectTimeBoxesTotalDuration = computed(() => {
  const projectTimeBoxes = toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]).filter(
    (timeBox: { project: string }) => timeBox.project === props.project.id,
  )

  return getTotalDurationLabel(projectTimeBoxes)
})
const rowStyle = computed(() => getProjectSoftSurfaceStyle(props.project.colors))
const durationBadgeStyle = computed(() => getProjectBadgeStyle(props.project.colors))

watch(
  () => props.project.name,
  (nextName) => {
    if (!isNameEditMode.value) {
      dynamicName.value = nextName
    }
  },
)

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
  <div class="rounded-2xl border px-3 py-3" :style="rowStyle">
    <div class="flex gap-2">
      <input
        v-if="isNameEditMode"
        ref="myInput"
        v-model="dynamicName"
        type="text"
        class="flex-1 p-1 font-bold text-text hover:underline focus:bg-input-focus focus:no-underline!"
        @input="mutationErrorMessage = ''"
        @keyup.enter="renameProjectDocument"
        @keyup.esc="cancelRenameAndLoseFocus"
        @blur="handleBlur"
      />
      <button
        v-if="!isNameEditMode"
        class="flex-1 cursor-pointer p-1 text-left font-bold text-text hover:underline"
        @click="router.push(getProjectPath(project.id))"
      >
        {{ dynamicName }}
      </button>
      <div
        class="relative top-1 mt-1.5 mb-3 ml-2 w-max self-start rounded-md border px-1.5 py-0.5 pt-px font-data text-xs tracking-wide"
        :style="durationBadgeStyle"
      >
        {{ projectTimeBoxesTotalDuration }} hrs
      </div>
      <button
        class="cursor-pointer rounded-md border border-button-secondary-border px-2 py-1 text-xs font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
        @click="router.push(getProjectEditPath(project.id))"
      >
        Edit
      </button>
      <button
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        @click="isNameEditMode = !isNameEditMode"
      >
        <EditIcon />
      </button>
      <button
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        @click="deleteProjectDocument"
      >
        <DeleteIcon />
      </button>
    </div>
    <p v-if="mutationErrorMessage" class="mt-2 px-1 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
