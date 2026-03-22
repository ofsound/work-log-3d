<script setup lang="ts">
import type { PropType } from 'vue'

import { getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'
import {
  buildMonthGridDays,
  formatDateKey,
  getMonthGridRange,
  isSameDay,
  moveTimeBoxToDay,
  splitTimeBoxIntoDaySegments,
} from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

const props = defineProps({
  anchorDate: { type: Date, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  selectedSessionId: { type: String, default: '' },
})

const emit = defineEmits(['openSession', 'openDay', 'changeSession'])

const VISIBLE_ROWS = 3

const gridRange = computed(() => getMonthGridRange(props.anchorDate))
const gridDays = computed(() => buildMonthGridDays(props.anchorDate))

const daySegmentsByKey = computed(() => {
  const map = new Map<
    string,
    Array<{
      id: string
      timeBox: TimeBox
      segmentStart: Date
      segmentEnd: Date
    }>
  >()

  props.timeBoxes.forEach((timeBox) => {
    splitTimeBoxIntoDaySegments(timeBox, gridRange.value).forEach((segment) => {
      const key = formatDateKey(segment.dayStart)
      const current = map.get(key) ?? []

      current.push({
        id: `${timeBox.id}-${segment.segmentStart.valueOf()}`,
        timeBox,
        segmentStart: segment.segmentStart,
        segmentEnd: segment.segmentEnd,
      })
      current.sort((left, right) => left.segmentStart.valueOf() - right.segmentStart.valueOf())
      map.set(key, current)
    })
  })

  return map
})

const dragState = ref<{ timeBox: TimeBox; duplicate: boolean } | null>(null)

const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, index) =>
    gridDays.value[index]!.toLocaleDateString([], { weekday: 'short' }),
  ),
)

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled'
const getProjectStyle = (projectId: string) => {
  const project = props.projectById[projectId]

  return project ? getProjectSoftSurfaceStyle(project.colors) : {}
}

const getDaySegments = (day: Date) => daySegmentsByKey.value.get(formatDateKey(day)) ?? []

const getVisibleSegments = (day: Date) => getDaySegments(day).slice(0, VISIBLE_ROWS)

const getHiddenCount = (day: Date) => Math.max(0, getDaySegments(day).length - VISIBLE_ROWS)

const formatSegmentTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

const isOutsideAnchorMonth = (day: Date) => day.getMonth() !== props.anchorDate.getMonth()

const handleDayClick = (day: Date) => {
  emit('openDay', day)
}

const handleSegmentDragStart = (timeBox: TimeBox, event: DragEvent) => {
  if (!event.dataTransfer) {
    return
  }

  dragState.value = {
    timeBox,
    duplicate: event.altKey,
  }
  event.dataTransfer.effectAllowed = event.altKey ? 'copyMove' : 'move'
  event.dataTransfer.setData('text/plain', timeBox.id)
}

const handleSegmentDrop = (day: Date, event: DragEvent) => {
  event.preventDefault()

  if (!dragState.value) {
    return
  }

  emit('changeSession', {
    id: dragState.value.timeBox.id,
    input: moveTimeBoxToDay(dragState.value.timeBox, day),
    duplicate: dragState.value.duplicate,
  } satisfies SessionChangePayload)

  dragState.value = null
}

const handleSegmentDragEnd = () => {
  dragState.value = null
}
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <div class="h-full overflow-auto overscroll-contain px-6 py-6">
      <div
        class="min-w-[980px] overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
      >
        <div class="grid grid-cols-7 border-b border-border bg-surface-muted">
          <div
            v-for="weekday in weekdays"
            :key="weekday"
            class="border-r border-border px-4 py-3 text-sm font-semibold tracking-[0.18em] text-text-subtle uppercase last:border-r-0"
          >
            {{ weekday }}
          </div>
        </div>

        <div class="grid grid-cols-7">
          <button
            v-for="day in gridDays"
            :key="formatDateKey(day)"
            class="flex min-h-40 cursor-pointer flex-col gap-2 border-r border-b border-border px-3 py-3 text-left align-top transition last:border-r-0 hover:bg-surface-muted"
            :class="{
              'bg-surface-muted/50 text-text-subtle': isOutsideAnchorMonth(day),
              'ring-1 ring-link/20 ring-inset': isSameDay(day, new Date()),
            }"
            @click="handleDayClick(day)"
            @dragover.prevent
            @drop="handleSegmentDrop(day, $event)"
          >
            <div class="flex items-center justify-between">
              <div class="text-lg font-semibold">{{ day.getDate() }}</div>
              <div
                v-if="isSameDay(day, new Date())"
                class="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white"
              >
                Today
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <button
                v-for="segment in getVisibleSegments(day)"
                :key="segment.id"
                class="cursor-pointer rounded-md border px-2 py-1 text-left text-xs text-text hover:brightness-97"
                :class="{ 'ring-2 ring-link': selectedSessionId === segment.timeBox.id }"
                :style="getProjectStyle(segment.timeBox.project)"
                draggable="true"
                @click.stop="emit('openSession', segment.timeBox.id)"
                @dragstart="handleSegmentDragStart(segment.timeBox, $event)"
                @dragend="handleSegmentDragEnd"
              >
                <span class="font-semibold">{{ formatSegmentTime(segment.segmentStart) }}</span>
                <span class="ml-1 truncate">{{ getProjectName(segment.timeBox.project) }}</span>
              </button>

              <button
                v-if="getHiddenCount(day) > 0"
                class="cursor-pointer rounded-md border border-dashed border-border px-2 py-1 text-left text-xs font-semibold text-text-subtle hover:bg-surface"
                @click.stop="emit('openDay', day)"
              >
                +{{ getHiddenCount(day) }} more
              </button>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
