<script setup lang="ts">
import { computed, type CSSProperties, type PropType } from 'vue'

import type { HomeActivityWeek } from '~~/shared/worklog'

const EMPTY_BAR_HEIGHT_PX = 3
const MIN_ACTIVE_BAR_HEIGHT_PX = 5

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  weeks: { type: Array as PropType<HomeActivityWeek[]>, default: () => [] },
})

const hasWeeks = computed(() => props.weeks.length > 0)
const maxMinutes = computed(() =>
  props.weeks.reduce((maximum, week) => Math.max(maximum, week.totalMinutes), 0),
)
const monthLabels = computed(() => {
  const labels: { key: string; label: string; title: string; left: string }[] = []
  const addMonth = (date: Date, weekOffset: number) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (labels.some((label) => label.key === key)) return
    labels.push({
      key,
      label: date.toLocaleDateString([], { month: 'short' }),
      title: date.toLocaleDateString([], { month: 'long', year: 'numeric' }),
      left: `${(weekOffset / props.weeks.length) * 100}%`,
    })
  }

  if (props.weeks[0]) addMonth(props.weeks[0].weekStart, 0)
  props.weeks.forEach((week, index) => {
    if (week.monthBoundaryOffsetDays === null) return
    const boundary = new Date(week.weekStart.getTime())
    boundary.setDate(boundary.getDate() + week.monthBoundaryOffsetDays)
    addMonth(boundary, index + week.monthBoundaryOffsetDays / 7)
  })
  return labels
})

const getBarHeight = (week: HomeActivityWeek) => {
  if (!week.hasActivity || maxMinutes.value === 0) {
    return `${EMPTY_BAR_HEIGHT_PX}px`
  }

  return `max(${MIN_ACTIVE_BAR_HEIGHT_PX}px, ${(week.totalMinutes / maxMinutes.value) * 100}%)`
}

const getFrontFaceClass = (week: HomeActivityWeek) =>
  week.hasActivity
    ? 'border-home-activity-bar-edge bg-linear-to-b from-home-activity-bar-top via-home-activity-bar-mid to-home-activity-bar-base'
    : 'border-home-activity-bar-ghost-edge bg-linear-to-b from-home-activity-bar-ghost-top to-home-activity-bar-ghost-base opacity-88'

const getBarFrameClass = (week: HomeActivityWeek) => [
  'absolute inset-0 border shadow-[0_18px_28px_-18px_var(--color-home-activity-bar-shadow)]',
  getFrontFaceClass(week),
  week.isCurrentWeek
    ? '[box-shadow:0_0_0_1px_var(--color-home-activity-bar-current-ring),0_18px_28px_-18px_var(--color-home-activity-bar-shadow),0_0_26px_-8px_var(--color-home-activity-bar-current-glow)]'
    : '',
]

const getMonthDividerStyle = (week: HomeActivityWeek): CSSProperties | undefined => {
  if (week.monthBoundaryOffsetDays === null) {
    return undefined
  }

  return {
    left: `${(week.monthBoundaryOffsetDays / 7) * 100}%`,
  }
}
</script>

<template>
  <div class="w-[80%] max-w-[80rem] shrink-0" data-home-activity-timeline>
    <ContainerCard
      class="overflow-hidden px-4 py-4 md:px-6 md:py-5"
      padding="compact"
      variant="gradient"
    >
      <div v-if="hasWeeks" class="min-w-0">
        <div
          class="from-home-activity-stage-top via-home-activity-stage-mid to-home-activity-stage-bottom relative overflow-hidden bg-linear-to-b px-3 pt-3 pb-4"
        >
          <div
            class="pointer-events-none absolute inset-0 opacity-35"
            style="
              background-image: linear-gradient(
                to right,
                var(--color-home-activity-stage-grid) 1px,
                transparent 1px
              );
              background-size: 36px 100%;
            "
          />
          <div
            class="from-home-activity-floor-left via-home-activity-floor-mid to-home-activity-floor-right pointer-events-none absolute inset-x-3 bottom-3 h-4 rounded-full bg-linear-to-r opacity-95"
          />
          <div
            class="pointer-events-none absolute inset-x-3 bottom-3 h-px bg-home-activity-rail shadow-[0_0_20px_var(--color-home-activity-rail-glow)]"
          />

          <div
            class="relative grid h-40 items-stretch md:h-48"
            :style="{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }"
          >
            <div
              v-for="week in weeks"
              :key="week.weekStart.valueOf()"
              class="relative flex h-full min-w-0 items-end justify-center overflow-visible px-[0.5px] md:px-[1px]"
            >
              <div
                v-if="week.monthBoundaryOffsetDays !== null"
                class="pointer-events-none absolute top-0 bottom-4 z-0 w-px -translate-x-1/2 bg-home-activity-month-divider"
                data-home-activity-month-divider
                :style="getMonthDividerStyle(week)"
              />
              <div
                class="relative z-[1] w-[74%] min-w-[3px]"
                :data-home-activity-current="week.isCurrentWeek ? 'true' : 'false'"
                :data-home-activity-empty="week.hasActivity ? 'false' : 'true'"
                data-home-activity-week
                :style="{ height: getBarHeight(week) }"
              >
                <div
                  class="absolute inset-x-[2%] -bottom-1 h-4 rounded-full blur-[8px]"
                  :class="
                    week.hasActivity
                      ? 'bg-home-activity-bar-shadow/45'
                      : 'bg-home-activity-bar-shadow/20'
                  "
                />
                <div :class="getBarFrameClass(week)" />
                <div
                  v-if="week.isCurrentWeek"
                  class="absolute inset-x-[14%] top-[22%] h-px bg-home-activity-current-highlight"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          class="relative mx-3 mt-1 h-3 text-[9px] leading-none font-medium tracking-wide text-text-subtle uppercase"
        >
          <span
            v-for="month in monthLabels"
            :key="month.key"
            class="absolute top-0 whitespace-nowrap"
            :style="{ left: month.left }"
            :title="month.title"
            data-home-activity-month-label
            >{{ month.label }}</span
          >
        </div>
      </div>

      <div
        v-else
        class="border-home-activity-stage-border from-home-activity-stage-top via-home-activity-stage-mid to-home-activity-stage-bottom relative h-28 overflow-hidden border bg-linear-to-b px-3 pt-3 pb-4"
      >
        <div
          class="from-home-activity-floor-left via-home-activity-floor-mid to-home-activity-floor-right absolute inset-x-3 bottom-3 h-4 rounded-full bg-linear-to-r opacity-90"
        />
        <div class="absolute inset-x-3 bottom-3 h-px bg-home-activity-rail" />
        <div
          class="absolute inset-x-[10%] bottom-4 h-4 rounded-full bg-home-activity-bar-shadow/25 blur-[8px]"
        />
        <div
          class="absolute inset-x-[16%] bottom-3 h-4 border border-home-activity-bar-ghost-edge bg-linear-to-b from-home-activity-bar-ghost-top to-home-activity-bar-ghost-base opacity-80"
        />
        <div class="absolute inset-x-0 top-5 text-center text-sm font-medium text-text-subtle">
          No activity yet
        </div>
      </div>
    </ContainerCard>
  </div>
</template>
