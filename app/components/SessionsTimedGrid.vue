<script setup lang="ts">
import type { PropType } from 'vue'

import {
  CALENDAR_WEEKDAY_HEADER_LABEL_CLASS_NAME,
  TIMED_WEEK_HEADER_CELL_CLASS_NAME,
  TIMED_WEEK_HEADER_HEIGHT_PX,
} from '~/utils/calendar-header'
import { getTimedGridMinWidthPx, TIMED_GRID_TIME_GUTTER_WIDTH_PX } from '~/utils/calendar-grid'
import {
  getProjectBadgeStyle,
  getProjectDuotoneSoftSurfaceStyle,
} from '~/utils/project-color-styles'
import {
  useSessionsTimedGridInteraction,
  type SessionCreateRange,
  type SessionsTimedGridProps,
} from '~/composables/useSessionsTimedGridInteraction'
import type { Project, TimeBox, TimeBoxDaySegmentLayout } from '~~/shared/worklog'
import {
  formatDateKey,
  getMinutesSinceStartOfDay,
  isSameDay,
  MINUTES_PER_DAY,
} from '~~/shared/worklog'

const props = defineProps({
  activeDate: { type: Date, required: true },
  createPreviewRange: {
    type: Object as PropType<SessionCreateRange | null>,
    default: null,
  },
  days: { type: Array as PropType<Date[]>, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  selectedSessionId: { type: String, default: '' },
  scrollAlignTarget: { type: Object as PropType<HTMLElement | null>, default: null },
  headerClickEnabled: { type: Boolean, default: false },
}) as SessionsTimedGridProps

const emit = defineEmits([
  'openSession',
  'openScratchpad',
  'openDay',
  'createSession',
  'changeSession',
  'dismissCalendar',
])

const HOUR_HEIGHT = 72
const TIME_GUTTER_WIDTH = TIMED_GRID_TIME_GUTTER_WIDTH_PX
const DAY_VIEW_MIN_DAY_COLUMN_WIDTH = 160
const SNAP_MINUTES = 10
const MINIMUM_DURATION_MINUTES = 10
const INTERACTION_THRESHOLD = 4
const SEVEN_THIRTY_TOP_PX = 7.5 * HOUR_HEIGHT

const {
  dayLayouts,
  getSessionDurationMinutes,
  handleCreatePointerDown,
  handleDayHeaderClick,
  handleResizePointerDown,
  handleSessionPointerDown,
  handleWeekColumnBackingClick,
  hours,
  interactionState,
  isWeekView,
  now,
  nowMarker,
  previewStyle,
  scrollContainerRef,
  setCalendarSurfaceRef,
  setSevenThirtyLineRef,
  visibleDays,
  weekCalendarGridRef,
  weekHeaderRef,
} = useSessionsTimedGridInteraction({
  hourHeight: HOUR_HEIGHT,
  interactionThreshold: INTERACTION_THRESHOLD,
  minimumDurationMinutes: MINIMUM_DURATION_MINUTES,
  onChangeSession: (payload) => emit('changeSession', payload),
  onCreateSession: (payload) => emit('createSession', payload),
  onDismissCalendar: () => emit('dismissCalendar'),
  onOpenDay: (day) => emit('openDay', day),
  onOpenScratchpad: () => emit('openScratchpad'),
  onOpenSession: (sessionId) => emit('openSession', sessionId),
  props,
  snapMinutes: SNAP_MINUTES,
  timeGutterWidth: TIME_GUTTER_WIDTH,
})

const dayViewGridStyle = computed(() => ({
  gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(${visibleDays.value.length}, minmax(${DAY_VIEW_MIN_DAY_COLUMN_WIDTH}px, 1fr))`,
  minWidth: `${TIME_GUTTER_WIDTH + DAY_VIEW_MIN_DAY_COLUMN_WIDTH * visibleDays.value.length}px`,
}))
const weekGridStyle = computed(() => ({
  gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(${visibleDays.value.length}, minmax(0, 1fr))`,
  minWidth: `${getTimedGridMinWidthPx(visibleDays.value.length)}px`,
}))

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled'
const getProject = (projectId: string) => props.projectById[projectId]

const getDurationBadgeStyle = (projectId: string) => {
  const project = getProject(projectId)
  return project ? getProjectBadgeStyle(project.colors) : {}
}

const formatHourLabel = (hour: number) =>
  new Date(2026, 0, 1, hour).toLocaleTimeString([], {
    hour: 'numeric',
  })

const formatDayHeader = (date: Date) =>
  visibleDays.value.length === 1
    ? date.toLocaleDateString([], { weekday: 'long' })
    : `${date.toLocaleDateString([], { weekday: 'short' })} ${date.getDate()}`

const weekHeaderStyle = computed(() => ({
  height: `${TIMED_WEEK_HEADER_HEIGHT_PX}px`,
}))

const getDayHeaderCellClass = (day: Date) => {
  if (isSameDay(day, now.value)) {
    return 'bg-surface-muted bg-[image:var(--background-image-calendar-day-today)]'
  }

  return 'bg-surface-muted'
}

const getEventStyle = (layout: TimeBoxDaySegmentLayout) => {
  const top = (getMinutesSinceStartOfDay(layout.segmentStart) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24
  const height = Math.max(
    24,
    ((layout.segmentEnd.valueOf() - layout.segmentStart.valueOf()) / 86_400_000) * HOUR_HEIGHT * 24,
  )
  const width = `calc(${100 / layout.laneCount}% - 0.75rem)`
  const left = `calc(${(100 / layout.laneCount) * layout.lane}% + 0.375rem)`
  const project = getProject(layout.timeBox.project)

  return {
    top: `${top}px`,
    height: `${height}px`,
    left,
    width,
    ...(project ? getProjectDuotoneSoftSurfaceStyle(project.colors) : {}),
  }
}
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <!-- Day view: one scroll area; no sticky day header (panel top aligns with 12am). -->
    <div
      v-if="!isWeekView"
      ref="scrollContainerRef"
      class="h-full overflow-auto overscroll-contain px-6 py-6"
    >
      <ContainerCard
        ref="weekCalendarGridRef"
        class="grid min-h-full w-full overflow-hidden"
        padding="none"
        variant="subtle"
        :style="dayViewGridStyle"
      >
        <div class="relative border-r border-border bg-surface-muted">
          <div :style="{ height: `${HOUR_HEIGHT * 24}px` }">
            <div
              v-for="hour in hours"
              :key="hour"
              class="absolute inset-x-0 pr-3 text-right text-xs text-text-subtle"
              :class="{ 'border-t border-border-subtle': hour !== 0 }"
              :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
            >
              <div v-if="hour !== 0" class="relative -top-2.5">{{ formatHourLabel(hour) }}</div>
            </div>
          </div>
        </div>

        <div
          v-for="(day, dayIndex) in visibleDays"
          :key="`${formatDateKey(day)}-column`"
          class="relative border-l border-border"
        >
          <div
            :ref="(el) => setCalendarSurfaceRef(el, dayIndex)"
            class="relative select-none"
            :class="{ 'bg-link/5': isWeekView && isSameDay(day, now) }"
            :style="{ height: `${HOUR_HEIGHT * 24}px` }"
            @pointerdown="handleCreatePointerDown"
          >
            <div
              v-if="dayIndex === 0"
              :ref="(el) => setSevenThirtyLineRef(el, dayIndex)"
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 z-0"
              :style="{ top: `${SEVEN_THIRTY_TOP_PX}px`, height: '0' }"
            ></div>

            <div
              v-for="hour in hours"
              :key="`${formatDateKey(day)}-${hour}`"
              class="pointer-events-none absolute inset-x-0"
              :class="{ 'border-t border-border-subtle': hour !== 0 }"
              :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
            >
              <div class="absolute inset-x-0 top-1/2 border-t border-border-subtle/60"></div>
            </div>

            <div
              v-if="previewStyle && previewStyle.dayIndex === dayIndex"
              class="pointer-events-none absolute rounded-lg border border-dashed border-link bg-link/12"
              :style="previewStyle.style"
            ></div>

            <div
              v-if="nowMarker && nowMarker.dayIndex === dayIndex"
              class="pointer-events-none absolute inset-x-0 z-15 border-t-2 border-danger"
              :style="{ top: `${nowMarker.top}px` }"
            >
              <div
                class="absolute -top-2 left-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-text-inverse"
              >
                {{ now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
              </div>
            </div>

            <div
              v-for="layout in dayLayouts[dayIndex]"
              :key="`${layout.timeBoxId}-${layout.segmentStart.valueOf()}`"
              class="absolute z-10 cursor-pointer rounded-lg border px-2 py-1 text-left text-text transition-[box-shadow,filter] duration-150 ease-out hover:z-20 hover:brightness-[1.02]"
              :class="{
                'shadow-panel-selected ring-1 ring-link/35 ring-inset':
                  selectedSessionId === layout.timeBoxId,
                'shadow-panel': selectedSessionId !== layout.timeBoxId,
                'hover:shadow-[var(--shadow-panel-selected)]':
                  selectedSessionId !== layout.timeBoxId,
                'opacity-50':
                  interactionState?.mode === 'move' &&
                  interactionState.timeBox.id === layout.timeBoxId,
              }"
              :style="getEventStyle(layout)"
              @pointerdown="handleSessionPointerDown(layout, $event)"
            >
              <button
                v-if="layout.startsOnThisDay"
                type="button"
                class="absolute inset-x-0 -top-1.5 z-[11] h-3.5 cursor-ns-resize rounded-t-lg"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'start', $event)"
              ></button>

              <div
                class="pointer-events-none flex h-full min-h-0 items-start justify-between gap-2 overflow-hidden"
              >
                <div class="min-w-0 flex-1 truncate text-sm leading-none font-bold">
                  {{ getProjectName(layout.timeBox.project) }}
                </div>
                <DurationPill
                  format="minutes"
                  :minutes="getSessionDurationMinutes(layout)"
                  :style="getDurationBadgeStyle(layout.timeBox.project)"
                  tone="project"
                  variant="compact"
                />
              </div>

              <button
                v-if="layout.endsOnThisDay"
                type="button"
                class="absolute inset-x-0 -bottom-1.5 z-[11] h-3.5 cursor-ns-resize rounded-b-lg"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'end', $event)"
              ></button>
            </div>
          </div>
        </div>
      </ContainerCard>
    </div>

    <!-- Week view: fixed header row; hours + sessions scroll underneath. -->
    <div v-else class="flex h-full min-h-0 flex-col px-6 py-6">
      <ContainerCard
        class="flex min-h-0 flex-1 flex-col overflow-hidden"
        padding="none"
        variant="subtle"
      >
        <div ref="scrollContainerRef" class="min-h-0 flex-1 overflow-auto overscroll-contain">
          <div class="min-h-full" :style="{ minWidth: weekGridStyle.minWidth }">
            <div
              ref="weekHeaderRef"
              class="sticky top-0 z-20 grid border-b border-border bg-surface-muted"
              :style="weekGridStyle"
            >
              <div class="border-r border-border bg-surface-muted"></div>
              <component
                :is="headerClickEnabled ? 'button' : 'div'"
                v-for="day in visibleDays"
                :key="formatDateKey(day)"
                :type="headerClickEnabled ? 'button' : undefined"
                :style="weekHeaderStyle"
                :class="[
                  TIMED_WEEK_HEADER_CELL_CLASS_NAME,
                  getDayHeaderCellClass(day),
                  headerClickEnabled && 'cursor-pointer',
                  headerClickEnabled && isSameDay(day, now) && 'hover:bg-link/15',
                  headerClickEnabled && !isSameDay(day, now) && 'hover:bg-surface',
                ]"
                @click="handleDayHeaderClick(day)"
              >
                <div :class="CALENDAR_WEEKDAY_HEADER_LABEL_CLASS_NAME">
                  {{ formatDayHeader(day) }}
                </div>
              </component>
            </div>

            <div ref="weekCalendarGridRef" class="grid min-h-full w-full" :style="weekGridStyle">
              <div class="relative border-r border-border bg-surface-muted">
                <div :style="{ height: `${HOUR_HEIGHT * 24}px` }">
                  <div
                    v-for="hour in hours"
                    :key="hour"
                    class="absolute inset-x-0 pr-3 text-right text-xs text-text-subtle"
                    :class="{ 'border-t border-border-subtle': hour !== 0 }"
                    :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
                  >
                    <div class="relative -top-2.5">{{ formatHourLabel(hour) }}</div>
                  </div>
                </div>
              </div>

              <div
                v-for="(day, dayIndex) in visibleDays"
                :key="`${formatDateKey(day)}-column`"
                class="relative border-l border-border"
              >
                <div
                  :ref="(el) => setCalendarSurfaceRef(el, dayIndex)"
                  class="relative select-none"
                  :class="{ 'bg-link/5': isWeekView && isSameDay(day, now) }"
                  :style="{ height: `${HOUR_HEIGHT * 24}px` }"
                  @pointerdown="handleCreatePointerDown"
                  @click="handleWeekColumnBackingClick(day, $event)"
                >
                  <div
                    v-if="dayIndex === 0"
                    :ref="(el) => setSevenThirtyLineRef(el, dayIndex)"
                    aria-hidden="true"
                    class="pointer-events-none absolute inset-x-0 z-0"
                    :style="{ top: `${SEVEN_THIRTY_TOP_PX}px`, height: '0' }"
                  ></div>

                  <div
                    v-for="hour in hours"
                    :key="`${formatDateKey(day)}-${hour}`"
                    class="pointer-events-none absolute inset-x-0"
                    :class="{ 'border-t border-border-subtle': hour !== 0 }"
                    :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
                  >
                    <div class="absolute inset-x-0 top-1/2 border-t border-border-subtle/60"></div>
                  </div>

                  <div
                    v-if="previewStyle && previewStyle.dayIndex === dayIndex"
                    class="pointer-events-none absolute rounded-lg border border-dashed border-link bg-link/12"
                    :style="previewStyle.style"
                  ></div>

                  <div
                    v-if="nowMarker && nowMarker.dayIndex === dayIndex"
                    class="pointer-events-none absolute inset-x-0 z-15 border-t-2 border-danger"
                    :style="{ top: `${nowMarker.top}px` }"
                  >
                    <div
                      class="absolute -top-2 left-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-text-inverse"
                    >
                      {{ now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
                    </div>
                  </div>

                  <div
                    v-for="layout in dayLayouts[dayIndex]"
                    :key="`${layout.timeBoxId}-${layout.segmentStart.valueOf()}`"
                    class="absolute z-10 cursor-pointer rounded-lg border px-2 py-1 text-left text-text transition-[box-shadow,filter] duration-150 ease-out hover:z-20 hover:brightness-[1.02]"
                    :class="{
                      'shadow-panel-selected ring-1 ring-link/35 ring-inset':
                        selectedSessionId === layout.timeBoxId,
                      'shadow-panel': selectedSessionId !== layout.timeBoxId,
                      'hover:shadow-[var(--shadow-panel-selected)]':
                        selectedSessionId !== layout.timeBoxId,
                      'opacity-50':
                        interactionState?.mode === 'move' &&
                        interactionState.timeBox.id === layout.timeBoxId,
                    }"
                    :style="getEventStyle(layout)"
                    @pointerdown="handleSessionPointerDown(layout, $event)"
                  >
                    <button
                      v-if="layout.startsOnThisDay"
                      type="button"
                      class="absolute inset-x-0 -top-1.5 z-[11] h-3.5 cursor-ns-resize rounded-t-lg"
                      @pointerdown="handleResizePointerDown(layout.timeBox, 'start', $event)"
                    ></button>

                    <div
                      class="pointer-events-none flex h-full min-h-0 items-start justify-between gap-2 overflow-hidden"
                    >
                      <div class="min-w-0 flex-1 truncate text-sm leading-none font-bold">
                        {{ getProjectName(layout.timeBox.project) }}
                      </div>
                      <DurationPill
                        format="minutes"
                        :minutes="getSessionDurationMinutes(layout)"
                        :style="getDurationBadgeStyle(layout.timeBox.project)"
                        tone="project"
                        variant="compact"
                      />
                    </div>

                    <button
                      v-if="layout.endsOnThisDay"
                      type="button"
                      class="absolute inset-x-0 -bottom-1.5 z-[11] h-3.5 cursor-ns-resize rounded-b-lg"
                      @pointerdown="handleResizePointerDown(layout.timeBox, 'end', $event)"
                    ></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContainerCard>
    </div>
  </div>
</template>
