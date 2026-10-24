<script setup lang="ts">
import { computed, ref } from 'vue'

import { useMinuteVerticalDrag } from '~/composables/useMinuteVerticalDrag'
import { useTimerService } from '~/composables/useTimerService'
import {
  TIMER_EXTENSION_BUTTON_MAX_SM_CLASSES,
  TIMER_PRIMARY_ACTION_MAX_SM_CLASSES,
  TIMER_READOUT_MAX_SM_CENTER_WRAPPER_CLASSES,
  TIMER_READOUT_SHELL_CLASSES,
} from '~/utils/timer-readout'
import { formatSecondsToMinutesSeconds } from '~~/shared/worklog'

const { isReady, snapshot, addCountupMinutes, cancel, resume, startCountup, stop } =
  useTimerService()

const dragDeltaMinutes = ref<number | null>(null)
let dragStartedAtMs: number | null = null

const timerProgress = computed(() => {
  if (snapshot.value.mode !== 'countup') {
    return '00:00'
  }

  return dragDeltaMinutes.value === null
    ? snapshot.value.display
    : formatSecondsToMinutesSeconds(
        Math.max(0, snapshot.value.elapsedSeconds + dragDeltaMinutes.value * 60),
      )
})

const timerIsRunning = computed(
  () => snapshot.value.mode === 'countup' && snapshot.value.status === 'running',
)
const timerIsPaused = computed(
  () => snapshot.value.mode === 'countup' && snapshot.value.status === 'paused',
)
const countupParts = computed(() => {
  const [mins = '00', secs = '00'] = timerProgress.value.split(':')

  return { mins, secs }
})

const canAdjustTimer = computed(
  () => isReady.value && (timerIsRunning.value || timerIsPaused.value),
)
const { dragActive, onPointerDown } = useMinuteVerticalDrag({
  onSessionStart() {
    dragStartedAtMs = snapshot.value.startedAtMs
    dragDeltaMinutes.value = null
  },
  onDrag(deltaMinutes) {
    dragDeltaMinutes.value = deltaMinutes
  },
  onSessionEnd({ deltaMinutes, didDragBeyondThreshold }) {
    if (
      didDragBeyondThreshold &&
      deltaMinutes !== 0 &&
      canAdjustTimer.value &&
      snapshot.value.startedAtMs === dragStartedAtMs
    ) {
      void addCountupMinutes(deltaMinutes)
    }
    dragDeltaMinutes.value = null
  },
})
const handleTimerPointerDown = (event: PointerEvent) => {
  if (canAdjustTimer.value) onPointerDown(event)
}
</script>

<template>
  <ContainerCard
    class="relative flex w-full flex-nowrap items-center justify-between gap-3 rounded-sm pt-10 pb-4 sm:gap-7 sm:pt-7"
    :class="!isReady ? 'pointer-events-none opacity-60' : ''"
    padding="comfortable"
    variant="timer"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <div :class="TIMER_READOUT_SHELL_CLASSES">
        <TimerCancelButton @click="cancel" />
        <div :class="TIMER_READOUT_MAX_SM_CENTER_WRAPPER_CLASSES">
          <div
            class="flex touch-none flex-nowrap items-center"
            :class="
              dragActive ? 'cursor-grabbing select-none' : canAdjustTimer ? 'cursor-ns-resize' : ''
            "
            :title="canAdjustTimer ? 'Drag up to add minutes; down to subtract' : undefined"
            data-testid="countup-drag-readout"
            @pointerdown="handleTimerPointerDown"
          >
            {{ countupParts.mins }}<span class="relative -top-1">:</span>{{ countupParts.secs }}
          </div>
        </div>
      </div>
      <div
        v-if="isReady && (timerIsRunning || timerIsPaused)"
        class="flex h-12 shrink-0 flex-col justify-center gap-1 sm:h-14 sm:gap-2"
      >
        <AppButton
          data-testid="countup-add-5"
          :class="TIMER_EXTENSION_BUTTON_MAX_SM_CLASSES"
          size="xs"
          variant="secondary"
          @click="addCountupMinutes(5)"
        >
          +5 min
        </AppButton>
        <AppButton
          data-testid="countup-add-10"
          :class="TIMER_EXTENSION_BUTTON_MAX_SM_CLASSES"
          size="xs"
          variant="secondary"
          @click="addCountupMinutes(10)"
        >
          +10 min
        </AppButton>
      </div>
    </div>

    <div class="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-2">
      <TimerButton
        v-if="isReady && !timerIsRunning && !timerIsPaused"
        :class="TIMER_PRIMARY_ACTION_MAX_SM_CLASSES"
        @click="startCountup"
      >
        Start
      </TimerButton>
      <TimerButton
        v-if="isReady && timerIsRunning"
        :class="TIMER_PRIMARY_ACTION_MAX_SM_CLASSES"
        @click="stop"
      >
        Stop
      </TimerButton>
      <TimerButton
        v-if="isReady && timerIsPaused"
        :class="TIMER_PRIMARY_ACTION_MAX_SM_CLASSES"
        @click="resume"
      >
        Resume
      </TimerButton>
    </div>
    <span
      class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-sm leading-none font-semibold tracking-wide text-text opacity-80"
      aria-hidden="true"
    >
      Timer
    </span>
  </ContainerCard>
</template>
