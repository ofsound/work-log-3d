<script setup lang="ts">
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getProjectEditPathFromProject, getProjectPathFromProject } from '~/utils/worklog-routes'
import { getTotalDurationLabel } from '~~/shared/worklog'

import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import type { ProjectsPageLayout } from '~/utils/projects-page-layout'
import type { Project, TimeBox } from '~~/shared/worklog'

const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = withDefaults(
  defineProps<{
    layout?: ProjectsPageLayout
    project: Project
  }>(),
  {
    layout: 'list',
  },
)

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
    interactive
    padding="compact"
    :class="[
      'rounded-sm shadow-control hover:brightness-[1.03]',
      layout === 'list' ? 'px-3 py-1.5' : 'flex h-full min-h-[148px] flex-col px-3 py-3',
    ]"
    :style="rowStyle"
    variant="subtle"
    @click="router.push(getProjectPathFromProject(project))"
  >
    <template v-if="layout === 'list'">
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
    </template>
    <template v-else>
      <div class="flex h-full min-h-0 flex-1 flex-col gap-4">
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1">
          <span class="text-center font-bold text-text">{{ project.name }}</span>
          <span
            v-if="projectSessionDateRangeLabel"
            class="text-center font-data text-xs font-normal text-text-muted italic"
          >
            {{ projectSessionDateRangeLabel }}
          </span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <div
            class="rounded-md border px-1.5 py-0.5 pt-px font-data text-xs tracking-wide"
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
      </div>
    </template>
  </ContainerCard>
</template>
