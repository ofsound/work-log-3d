<script setup lang="ts">
import type { PropType } from 'vue'

import type { YearHeatmapCell, YearHeatmapIntensity, YearHeatmapYear } from '~~/shared/worklog'
import { isSameDay } from '~~/shared/worklog'

const props = defineProps({
  selectedDate: { type: Date, required: true },
  years: { type: Array as PropType<YearHeatmapYear[]>, default: () => [] },
})

const emit = defineEmits<{
  openDay: [day: Date]
}>()

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const legendLevels: YearHeatmapIntensity[] = [0, 1, 2, 3, 4, 5]

const formatHours = (hours: number) => {
  if (hours === 0) {
    return '0 hrs'
  }

  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} hrs`
}

const getCellSummary = (cell: YearHeatmapCell) => {
  if (cell.inactive) {
    return 'Outside tracked range'
  }

  if (cell.sessionCount === 0) {
    return 'No logged hours'
  }

  return `${formatHours(cell.hours)} across ${cell.sessionCount} ${
    cell.sessionCount === 1 ? 'session' : 'sessions'
  }`
}

const getCellLabel = (cell: YearHeatmapCell) =>
  `${cell.date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}: ${getCellSummary(cell)}`

const isSelectedCell = (cell: YearHeatmapCell) => isSameDay(cell.date, props.selectedDate)

const getToneClass = (intensity: YearHeatmapIntensity, inactive: boolean) => {
  if (inactive) {
    return 'border-border-subtle bg-surface-subtle/40 opacity-45'
  }

  if (intensity === 0) {
    return 'border-border-subtle bg-surface-muted/80'
  }

  if (intensity === 1) {
    return 'border-emerald-200 bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/70'
  }

  if (intensity === 2) {
    return 'border-emerald-300 bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/80'
  }

  if (intensity === 3) {
    return 'border-emerald-400 bg-emerald-300 dark:border-emerald-700 dark:bg-emerald-800'
  }

  if (intensity === 4) {
    return 'border-emerald-500 bg-emerald-400 dark:border-emerald-600 dark:bg-emerald-700'
  }

  return 'border-emerald-700 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500'
}

const getCellClass = (cell: YearHeatmapCell) => [
  'block aspect-square w-full rounded-[5px] border transition',
  getToneClass(cell.intensity, cell.inactive),
  cell.inactive ? 'cursor-default' : 'cursor-pointer hover:scale-[1.08] hover:shadow-control',
  cell.isToday ? '[box-shadow:inset_0_0_0_1px_var(--color-danger)]' : '',
  isSelectedCell(cell) ? 'ring-2 ring-link ring-offset-1 ring-offset-surface' : '',
]
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
  >
    <div class="h-full overflow-auto px-4 py-5 md:px-6">
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-end gap-3 text-xs font-semibold text-text-subtle">
          <span>Less</span>
          <div class="flex items-center gap-1">
            <span
              v-for="level in legendLevels"
              :key="level"
              class="block size-3 rounded-[4px] border"
              :class="getToneClass(level, false)"
            />
          </div>
          <span>More</span>
        </div>

        <section
          v-for="year in years"
          :key="year.year"
          class="rounded-2xl border border-border-subtle bg-surface-subtle/35 p-4 md:p-5"
        >
          <div
            class="mb-5 flex flex-col gap-1 border-b border-border-subtle pb-4 md:flex-row md:items-end md:justify-between"
          >
            <h2 class="font-data text-4xl font-bold tracking-[0.08em] md:text-5xl">
              {{ year.year }}
            </h2>
            <div class="text-sm font-semibold tracking-[0.2em] text-text-subtle uppercase">
              Contribution calendar
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="month in year.months"
              :key="`${year.year}-${month.monthIndex}`"
              class="rounded-2xl border border-border-subtle bg-surface px-3 py-3 shadow-control"
            >
              <div class="mb-3 text-lg font-semibold tracking-tight">{{ month.label }}</div>

              <div
                class="mb-2 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold tracking-[0.18em] text-text-subtle uppercase"
              >
                <div v-for="weekday in weekdays" :key="`${month.monthIndex}-${weekday}`">
                  {{ weekday }}
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <div
                  v-for="(week, weekIndex) in month.weeks"
                  :key="`${year.year}-${month.monthIndex}-${weekIndex}`"
                  class="grid grid-cols-7 gap-1"
                >
                  <template v-for="(cell, dayIndex) in week" :key="dayIndex">
                    <span
                      v-if="cell === null"
                      aria-hidden="true"
                      class="block aspect-square w-full"
                    />

                    <button
                      v-else-if="!cell.inactive"
                      type="button"
                      :aria-label="getCellLabel(cell)"
                      :class="getCellClass(cell)"
                      :title="getCellLabel(cell)"
                      @click="emit('openDay', cell.date)"
                    />

                    <div
                      v-else
                      :aria-label="getCellLabel(cell)"
                      :class="getCellClass(cell)"
                      :title="getCellLabel(cell)"
                    />
                  </template>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
