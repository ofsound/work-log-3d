<script setup lang="ts">
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import { getProjectEditPathFromProject, getProjectPathFromProject } from '~/utils/worklog-routes'
import type { Project, TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps<{
  project: Project
}>()

const router = useRouter()

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
  <ContainerCard
    class="rounded-sm px-3 py-1.5 shadow-control hover:brightness-[1.03]"
    interactive
    padding="compact"
    :style="rowStyle"
    variant="subtle"
    @click="router.push(getProjectPathFromProject(project))"
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
        @click.stop="router.push(getProjectEditPathFromProject(project))"
      >
        Edit
      </button>
    </div>
  </ContainerCard>
</template>
