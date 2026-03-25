<script setup lang="ts">
import { formatSecondsToMinutesSeconds } from '~~/shared/worklog'

const { isReady, snapshot, addCountdownMinutes, cancel, pause, resume, startCountdown } =
  useTimerService()
const dynamicMinutes = ref('30')
const route = useRoute()
const hasStartedPomodoro = ref(false)

const MINUTE_DRAG_THRESHOLD_PX = 6
/** Vertical pixels of drag per one minute of change (higher = slower / finer). */
const MINUTE_DRAG_PIXELS_PER_MINUTE = 6

const minuteDragDeltaMinutes = (startY: number, clientY: number) =>
  Math.round((startY - clientY) / MINUTE_DRAG_PIXELS_PER_MINUTE)

const minutePointerSession = ref(false)
const minuteDragActive = ref(false)
const minuteDragStartY = ref(0)
const lastMinuteDragClientY = ref(0)
const minuteDragBaselineIdleMinutes = ref(0)
const minuteDragBaselineRemainingSeconds = ref(0)
const minuteDragIsActiveTimer = ref(false)
const minuteDragPreviewRemainingSeconds = ref<number | null>(null)

const parseBaselineIdleMinutes = () => {
  const n = Number(dynamicMinutes.value || '0')

  return Number.isFinite(n) ? n : 0
}

const updateMinuteDragPreview = (clientY: number) => {
  lastMinuteDragClientY.value = clientY
  const deltaMinutes = minuteDragDeltaMinutes(minuteDragStartY.value, clientY)

  if (minuteDragIsActiveTimer.value) {
    minuteDragPreviewRemainingSeconds.value = Math.max(
      0,
      minuteDragBaselineRemainingSeconds.value + deltaMinutes * 60,
    )
  } else {
    dynamicMinutes.value = String(Math.max(0, minuteDragBaselineIdleMinutes.value + deltaMinutes))
  }
}

const endMinutePointerSession = (event: PointerEvent) => {
  if (!minutePointerSession.value) {
    return
  }

  if (minuteDragActive.value && minuteDragIsActiveTimer.value) {
    const y = Number.isFinite(event.clientY) ? event.clientY : lastMinuteDragClientY.value
    const totalDelta = minuteDragDeltaMinutes(minuteDragStartY.value, y)

    if (totalDelta !== 0) {
      void addCountdownMinutes(totalDelta)
    }
  }

  window.removeEventListener('pointermove', onMinuteWindowPointerMove)
  window.removeEventListener('pointerup', onMinuteWindowPointerUp)
  window.removeEventListener('pointercancel', onMinuteWindowPointerUp)

  minuteDragPreviewRemainingSeconds.value = null
  minutePointerSession.value = false
  minuteDragActive.value = false
}

const onMinuteWindowPointerMove = (event: PointerEvent) => {
  if (!minutePointerSession.value) {
    return
  }

  const dy = Math.abs(event.clientY - minuteDragStartY.value)

  if (!minuteDragActive.value) {
    if (dy < MINUTE_DRAG_THRESHOLD_PX) {
      return
    }

    minuteDragActive.value = true
    const input = document.getElementById('dynamicMinutes') as HTMLInputElement | null

    input?.blur()
  }

  event.preventDefault()
  updateMinuteDragPreview(event.clientY)
}

const onMinuteWindowPointerUp = (event: PointerEvent) => {
  endMinutePointerSession(event)
}

const handleMinuteColumnPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  minutePointerSession.value = true
  minuteDragActive.value = false
  minuteDragStartY.value = event.clientY
  lastMinuteDragClientY.value = event.clientY
  minuteDragBaselineIdleMinutes.value = parseBaselineIdleMinutes()
  minuteDragBaselineRemainingSeconds.value = snapshot.value.remainingSeconds ?? 0
  minuteDragIsActiveTimer.value = timerIsRunning.value || timerIsPaused.value
  minuteDragPreviewRemainingSeconds.value = null

  window.addEventListener('pointermove', onMinuteWindowPointerMove)
  window.addEventListener('pointerup', onMinuteWindowPointerUp)
  window.addEventListener('pointercancel', onMinuteWindowPointerUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMinuteWindowPointerMove)
  window.removeEventListener('pointerup', onMinuteWindowPointerUp)
  window.removeEventListener('pointercancel', onMinuteWindowPointerUp)
})

const updateDraftMinutes = (minutesToAdd: number) => {
  const currentMinutes = Number(dynamicMinutes.value || '0')
  const nextMinutes = (Number.isFinite(currentMinutes) ? currentMinutes : 0) + minutesToAdd

  dynamicMinutes.value = String(Math.max(0, nextMinutes))
}

const startTimer = () => {
  void startCountdown(Number(dynamicMinutes.value || '0'))
}

const addMinutes = (minutesToAdd: number) => {
  if (timerIsRunning.value || timerIsPaused.value) {
    void addCountdownMinutes(minutesToAdd)
    return
  }

  updateDraftMinutes(minutesToAdd)
}

const timerIsRunning = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.status === 'running',
)
const timerIsPaused = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.status === 'paused',
)

const countdownMinutesDisplay = computed(() => {
  const preview = minuteDragPreviewRemainingSeconds.value

  if (preview !== null) {
    return formatSecondsToMinutesSeconds(preview).split(':')[0] ?? '00'
  }

  return snapshot.value.display.split(':')[0] ?? '00'
})

const secondsProgress = computed(() => {
  if (snapshot.value.mode !== 'countdown') {
    return '00'
  }

  const preview = minuteDragPreviewRemainingSeconds.value

  if (preview !== null) {
    return formatSecondsToMinutesSeconds(preview).split(':')[1] ?? '00'
  }

  return snapshot.value.display.split(':')[1] ?? '00'
})

watch(
  () => snapshot.value,
  (nextSnapshot) => {
    if (minutePointerSession.value) {
      return
    }

    if (nextSnapshot.mode === 'countdown') {
      dynamicMinutes.value = nextSnapshot.display.split(':')[0] ?? dynamicMinutes.value
    }
  },
  { deep: true },
)

watch(
  [isReady, () => route.path, () => snapshot.value.mode],
  ([ready, path, mode]) => {
    if (!ready || path !== '/pomodoro' || mode !== null || hasStartedPomodoro.value) {
      return
    }

    hasStartedPomodoro.value = true
    startTimer()
  },
  { immediate: true },
)
</script>

<template>
  <ContainerCard
    class="flex w-full flex-nowrap items-center justify-between gap-7 rounded-sm py-4"
    padding="comfortable"
    variant="timer"
  >
    <div class="flex shrink-0 items-center gap-3">
      <div
        class="relative flex h-14 shrink-0 items-center rounded-sm border border-button-secondary-border bg-button-secondary px-2.5 font-data text-5xl leading-none font-bold whitespace-nowrap text-button-secondary-text tabular-nums"
      >
        <TimerCancelButton @click="cancel" />
        <div class="flex flex-nowrap items-center">
          <div
            class="touch-none"
            :class="minuteDragActive ? 'cursor-grabbing select-none' : 'cursor-ns-resize'"
            @pointerdown="handleMinuteColumnPointerDown"
          >
            <input
              v-if="!timerIsRunning && !timerIsPaused"
              id="dynamicMinutes"
              v-model="dynamicMinutes"
              type="text"
              class="m-0 w-14 border-0 bg-transparent p-0 text-right leading-none outline-none"
              @keyup.enter="($event.target as HTMLElement).blur()"
              @keyup.esc="($event.target as HTMLElement).blur()"
            />
            <div v-else class="w-14 text-right leading-none">
              {{ countdownMinutesDisplay }}
            </div>
          </div>
          <span class="relative -top-1">:</span>
          {{ secondsProgress }}
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <div class="flex flex-col gap-1">
          <button
            type="button"
            class="h-6 cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-2 text-xs leading-none font-bold tracking-normal text-button-secondary-text hover:border-border-strong hover:bg-button-secondary-hover"
            @click="addMinutes(-5)"
          >
            -5
          </button>
          <button
            type="button"
            class="h-6 cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-2 text-xs leading-none font-bold tracking-normal text-button-secondary-text hover:border-border-strong hover:bg-button-secondary-hover"
            @click="addMinutes(-10)"
          >
            -10
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <button
            type="button"
            class="h-6 cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-2 text-xs leading-none font-bold tracking-normal text-button-secondary-text hover:border-border-strong hover:bg-button-secondary-hover"
            @click="addMinutes(5)"
          >
            +5
          </button>
          <button
            type="button"
            class="h-6 cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-2 text-xs leading-none font-bold tracking-normal text-button-secondary-text hover:border-border-strong hover:bg-button-secondary-hover"
            @click="addMinutes(10)"
          >
            +10
          </button>
        </div>
      </div>
    </div>
    <TimerButton v-if="!timerIsRunning && !timerIsPaused" class="shrink-0" @click="startTimer"
      >Start Timer</TimerButton
    >
    <TimerButton v-if="timerIsRunning && !timerIsPaused" class="shrink-0" @click="pause"
      >Pause Timer</TimerButton
    >
    <TimerButton v-if="timerIsPaused" class="shrink-0" @click="resume">Resume Timer </TimerButton>
  </ContainerCard>
</template>
