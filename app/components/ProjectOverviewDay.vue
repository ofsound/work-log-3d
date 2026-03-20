<script setup lang="ts">
import type { TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

const props = defineProps<{
  projectOverviewDayData: TimeBox[]
}>()

const dayDuration = computed(() => getTotalDurationLabel(props.projectOverviewDayData))
</script>

<template>
  <div class="mb-12">
    <div class="px-2 font-script text-4xl font-bold">
      {{
        projectOverviewDayData[0]?.startTime?.toLocaleDateString([], {
          weekday: 'long',
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
        })
      }}
    </div>
    <div
      class="mt-1.5 mr-2 mb-3 ml-2.5 w-max rounded-md border bg-emerald-800 px-1.5 py-0.5 pt-px font-data text-sm tracking-wide text-white"
    >
      {{ dayDuration }} hrs
    </div>
    <div
      class="relative my-4 rounded-sm border border-gray-400/20 bg-gray-100 px-6 pt-6 pb-3.5 shadow-md"
    >
      <TimeBox
        v-for="item in projectOverviewDayData"
        :id="item.id"
        :key="item.id"
        variant="project"
      />
    </div>
  </div>
</template>
