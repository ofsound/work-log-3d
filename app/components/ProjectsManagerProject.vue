<script setup lang="ts">
import DeleteIcon from '@/icons/DeleteIcon.vue'

import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import { getProjectEditPath, getProjectPath } from '~/utils/worklog-routes'
import type { Project, TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel, getWorklogErrorMessage } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps<{
  project: Project
}>()

const router = useRouter()
const mutationErrorMessage = ref('')

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

const projectTimeBoxes = computed<TimeBox[]>(() =>
  toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]).filter(
    (timeBox) => timeBox.project === props.project.id,
  ),
)

const projectTimeBoxesTotalDuration = computed(() => getTotalDurationLabel(projectTimeBoxes.value))

const projectSessionDateRangeLabel = computed(() => {
  const boxes = projectTimeBoxes.value

  if (boxes.length === 0) {
    return ''
  }

  let minMs = Infinity
  let maxMs = -Infinity

  for (const box of boxes) {
    const start = box.startTime?.getTime()
    if (start != null && !Number.isNaN(start)) {
      minMs = Math.min(minMs, start)
    }
    const endRaw = box.endTime?.getTime()
    const end = endRaw != null && !Number.isNaN(endRaw) ? endRaw : start
    if (end != null && !Number.isNaN(end)) {
      maxMs = Math.max(maxMs, end)
    }
  }

  if (minMs === Infinity || maxMs === -Infinity) {
    return ''
  }

  const minDate = new Date(minMs)
  const maxDate = new Date(maxMs)
  const dateOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }

  if (minDate.toDateString() === maxDate.toDateString()) {
    return minDate.toLocaleDateString(undefined, dateOpts)
  }

  return `${minDate.toLocaleDateString(undefined, dateOpts)} – ${maxDate.toLocaleDateString(undefined, dateOpts)}`
})

const rowStyle = computed(() => getProjectSoftSurfaceStyle(props.project.colors))
const durationBadgeStyle = computed(() => getProjectBadgeStyle(props.project.colors))
</script>

<template>
  <div
    class="cursor-pointer rounded-sm border px-3 py-1.5 shadow-control transition-[box-shadow,filter] duration-150 ease-out hover:shadow-[var(--shadow-panel)] hover:brightness-[1.03]"
    :style="rowStyle"
    @click="router.push(getProjectPath(project.id))"
  >
    <div class="flex gap-2">
      <div class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 p-1 text-left">
        <span class="font-bold text-text">{{ project.name }}</span>
        <span
          v-if="projectSessionDateRangeLabel"
          class="font-data text-xs font-normal text-text-muted italic"
        >
          {{ projectSessionDateRangeLabel }}
        </span>
      </div>
      <div
        class="relative top-1 mt-1.5 mb-3 ml-2 w-max self-start rounded-md border px-1.5 py-0.5 pt-px font-data text-xs tracking-wide"
        :style="durationBadgeStyle"
      >
        {{ projectTimeBoxesTotalDuration }} hrs
      </div>
      <button
        type="button"
        class="cursor-pointer rounded-md border border-button-secondary-border px-2 py-1 text-xs font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
        @click.stop="router.push(getProjectEditPath(project.id))"
      >
        Edit
      </button>
      <button
        type="button"
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        @click.stop="deleteProjectDocument"
      >
        <DeleteIcon />
      </button>
    </div>
    <p v-if="mutationErrorMessage" class="mt-2 px-1 text-sm text-danger" @click.stop>
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
