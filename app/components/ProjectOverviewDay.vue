<script setup lang="ts">
import { getProjectBadgeStyle } from '~/utils/project-color-styles'
import type { ProjectColors, TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

const props = defineProps<{
  projectOverviewDayData: TimeBox[]
  projectColors?: ProjectColors | null
}>()

const dayDuration = computed(() => getTotalDurationLabel(props.projectOverviewDayData))
const dayBadgeStyle = computed(() =>
  props.projectColors ? getProjectBadgeStyle(props.projectColors) : {},
)

/** Long weekday + abbreviated month (e.g. “Thursday, Nov 20, 2025” in en-US). */
const dayHeading = computed(() => {
  const start = props.projectOverviewDayData[0]?.startTime
  if (!start) {
    return ''
  }

  return start.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})
</script>

<template>
  <div class="mb-12">
    <div class="flex flex-wrap items-center gap-2 px-2">
      <div class="text-2xl font-bold tracking-tight">
        {{ dayHeading }}
      </div>
      <div
        class="w-max rounded-full border px-2.5 py-1 font-data text-xs tracking-wide"
        :style="dayBadgeStyle"
      >
        {{ dayDuration }} hrs
      </div>
    </div>
    <ContainerCard
      class="relative my-4 rounded-sm px-6 pt-6 pb-3.5"
      padding="comfortable"
      variant="day"
    >
      <div class="flex flex-col gap-1">
        <TimeBox
          v-for="item in projectOverviewDayData"
          :id="item.id"
          :key="item.id"
          compact
          variant="project"
        />
      </div>
    </ContainerCard>
  </div>
</template>
