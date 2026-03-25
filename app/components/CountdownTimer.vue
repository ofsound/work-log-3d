<script setup lang="ts">
import { toUserSettings, type FirebaseUserSettingsDocument } from '~/utils/worklog-firebase'
import {
  cloneUserSettings,
  DEFAULT_COUNTDOWN_DEFAULT_MINUTES,
  formatSecondsToMinutesSeconds,
  normalizeCountdownDefaultMinutes,
} from '~~/shared/worklog'

const { isReady, snapshot, addCountdownMinutes, cancel, pause, resume, startCountdown } =
  useTimerService()
const { rawSettings, savedSettings, saveSettings } = useUserSettings()

const dynamicMinutes = ref(String(DEFAULT_COUNTDOWN_DEFAULT_MINUTES))
const route = useRoute()
const hasStartedPomodoro = ref(false)

let persistDebounce: number | null = null

const clearPersistDebounce = () => {
  if (persistDebounce !== null) {
    window.clearTimeout(persistDebounce)
    persistDebounce = null
  }
}

const persistCountdownDefaultMinutes = async (minutes: number) => {
  const normalized = normalizeCountdownDefaultMinutes(minutes)

  if (normalized === savedSettings.value.workflow.countdownDefaultMinutes) {
    return
  }

  const next = cloneUserSettings(savedSettings.value)
  next.workflow.countdownDefaultMinutes = normalized
  await saveSettings(next)
}

const schedulePersistFromDynamicInput = () => {
  clearPersistDebounce()
  persistDebounce = window.setTimeout(() => {
    persistDebounce = null
    const n = Number(dynamicMinutes.value || '0')

    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return
    }

    void persistCountdownDefaultMinutes(n)
  }, 450)
}

onBeforeUnmount(() => {
  clearPersistDebounce()
})

const minuteDragBaselineIdleMinutes = ref(0)
const minuteDragBaselineRemainingSeconds = ref(0)
const minuteDragIsActiveTimer = ref(false)
const minuteDragPreviewRemainingSeconds = ref<number | null>(null)

const parseBaselineIdleMinutes = () => {
  const n = Number(dynamicMinutes.value || '0')

  return Number.isFinite(n) ? n : 0
}

const timerIsRunning = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.status === 'running',
)
const timerIsPaused = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.status === 'paused',
)

const {
  pointerSessionActive: minutePointerSession,
  dragActive: minuteDragActive,
  onPointerDown: handleMinuteColumnPointerDown,
} = useMinuteVerticalDrag({
  blurSelector: '#dynamicMinutes',
  onSessionStart() {
    minuteDragBaselineIdleMinutes.value = parseBaselineIdleMinutes()
    minuteDragBaselineRemainingSeconds.value = snapshot.value.remainingSeconds ?? 0
    minuteDragIsActiveTimer.value = timerIsRunning.value || timerIsPaused.value
    minuteDragPreviewRemainingSeconds.value = null
  },
  onDrag(deltaMinutes) {
    if (minuteDragIsActiveTimer.value) {
      minuteDragPreviewRemainingSeconds.value = Math.max(
        0,
        minuteDragBaselineRemainingSeconds.value + deltaMinutes * 60,
      )
    } else {
      dynamicMinutes.value = String(Math.max(0, minuteDragBaselineIdleMinutes.value + deltaMinutes))
    }
  },
  onSessionEnd({ deltaMinutes, didDragBeyondThreshold }) {
    if (didDragBeyondThreshold && minuteDragIsActiveTimer.value && deltaMinutes !== 0) {
      void addCountdownMinutes(deltaMinutes)
    }

    if (didDragBeyondThreshold && !minuteDragIsActiveTimer.value) {
      const n = Number(dynamicMinutes.value || '0')

      if (Number.isFinite(n) && Number.isInteger(n) && n > 0) {
        void persistCountdownDefaultMinutes(n)
      }
    }

    minuteDragPreviewRemainingSeconds.value = null
  },
})

const startTimer = () => {
  const n = Number(dynamicMinutes.value || '0')

  if (!Number.isFinite(n) || n <= 0) {
    return
  }

  const minutes = Math.floor(n)

  void persistCountdownDefaultMinutes(minutes)
  void startCountdown(minutes)
}

const handleCancel = async () => {
  await cancel()
  dynamicMinutes.value = String(savedSettings.value.workflow.countdownDefaultMinutes)
}

const onMinutesBlur = () => {
  // useMinuteVerticalDrag blurs #dynamicMinutes when crossing the drag threshold, before onDrag
  // runs — ignore that synthetic blur so we don't reset/persist from stale minutes.
  if (minutePointerSession.value) {
    return
  }

  clearPersistDebounce()
  const n = Number(dynamicMinutes.value || '0')

  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    dynamicMinutes.value = String(savedSettings.value.workflow.countdownDefaultMinutes)

    return
  }

  void persistCountdownDefaultMinutes(n)
}

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
      if (nextSnapshot.status === 'completed') {
        dynamicMinutes.value = String(savedSettings.value.workflow.countdownDefaultMinutes)
      } else {
        dynamicMinutes.value = nextSnapshot.display.split(':')[0] ?? dynamicMinutes.value
      }
    }
  },
  { deep: true },
)

watch(
  rawSettings,
  (doc) => {
    if (timerIsRunning.value || timerIsPaused.value) {
      return
    }

    if (minutePointerSession.value || minuteDragActive.value) {
      return
    }

    // While `rawSettings` is missing (loading or a transient gap around `setDoc`), `savedSettings`
    // falls back to defaults (30) — do not sync that into the field or it wipes local edits.
    if (!doc) {
      return
    }

    dynamicMinutes.value = String(
      toUserSettings(doc as FirebaseUserSettingsDocument).workflow.countdownDefaultMinutes,
    )
  },
  { deep: true, immediate: true },
)

watch(dynamicMinutes, () => {
  if (timerIsRunning.value || timerIsPaused.value || minutePointerSession.value) {
    return
  }

  schedulePersistFromDynamicInput()
})

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
    class="relative flex w-full flex-nowrap items-center justify-between gap-7 rounded-sm pt-7 pb-4"
    padding="comfortable"
    variant="timer"
  >
    <div
      class="relative flex h-14 shrink-0 items-center rounded-sm border border-button-secondary-border bg-button-secondary px-2.5 font-data text-5xl leading-none font-bold whitespace-nowrap text-button-secondary-text tabular-nums"
    >
      <TimerCancelButton @click="handleCancel" />
      <div
        class="flex touch-none flex-nowrap items-center self-stretch"
        :class="minuteDragActive ? 'cursor-grabbing select-none' : 'cursor-ns-resize'"
        @pointerdown="handleMinuteColumnPointerDown"
      >
        <div>
          <input
            v-if="!timerIsRunning && !timerIsPaused"
            id="dynamicMinutes"
            v-model="dynamicMinutes"
            type="text"
            class="m-0 w-14 border-0 bg-transparent p-0 text-right leading-none outline-none select-text"
            @keyup.enter="($event.target as HTMLElement).blur()"
            @keyup.esc="($event.target as HTMLElement).blur()"
            @blur="onMinutesBlur"
          />
          <div v-else class="w-14 text-right leading-none">
            {{ countdownMinutesDisplay }}
          </div>
        </div>
        <span class="relative -top-1">:</span>
        {{ secondsProgress }}
      </div>
    </div>
    <TimerButton v-if="!timerIsRunning && !timerIsPaused" class="shrink-0" @click="startTimer"
      >Start Timer</TimerButton
    >
    <TimerButton v-if="timerIsRunning && !timerIsPaused" class="shrink-0" @click="pause"
      >Pause Timer</TimerButton
    >
    <TimerButton v-if="timerIsPaused" class="shrink-0" @click="resume">Resume Timer </TimerButton>
    <span
      class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-xs leading-none font-medium text-text-muted opacity-80"
      aria-hidden="true"
    >
      Count Down
    </span>
  </ContainerCard>
</template>
