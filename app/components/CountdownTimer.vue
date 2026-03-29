<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { useRoute } from '#imports'

import { useMinuteVerticalDrag } from '~/composables/useMinuteVerticalDrag'
import { useTimerService } from '~/composables/useTimerService'
import { useUserSettings } from '~/composables/useUserSettings'
import { toUserSettings, type FirebaseUserSettingsDocument } from '~/utils/worklog-firebase'
import {
  cloneUserSettings,
  formatSecondsAsMinSecPhrase,
  formatSecondsToMinutesSeconds,
  normalizeCountdownDefaultMinutes,
} from '~~/shared/worklog'

const { isReady, snapshot, addCountdownMinutes, cancel, pause, resume, startCountdown } =
  useTimerService()
const { rawSettings, savedSettings, saveSettings, preferencesDocumentPending } = useUserSettings()

/** Empty until Firestore preferences finish loading so the default `30` does not flash before the saved value. */
const dynamicMinutes = ref('')
const idleMinutesHydrated = ref(false)

/** When true, ignore Firestore-driven idle sync so stale snapshots cannot clobber in-progress edits. */
const suppressingIdleMinutesRemoteSync = ref(false)
const idleMinutesLocalOverride = ref<number | null>(null)

/** When true, `dynamicMinutes` is being set from code (settings/timer), not the user — do not treat as a local edit. */
const applyingProgrammaticDynamicMinutes = ref(false)

const setDynamicMinutesProgrammatically = (next: string) => {
  applyingProgrammaticDynamicMinutes.value = true
  dynamicMinutes.value = next
  void nextTick(() => {
    applyingProgrammaticDynamicMinutes.value = false
  })
}

const clearIdleMinutesLocalOverride = () => {
  idleMinutesLocalOverride.value = null
  suppressingIdleMinutesRemoteSync.value = false
}

const resetIdleMinutesToSavedDefault = () => {
  clearIdleMinutesLocalOverride()
  setDynamicMinutesProgrammatically(String(savedSettings.value.workflow.countdownDefaultMinutes))
  idleMinutesHydrated.value = true
}

const markIdleMinutesAsLocallyEdited = (minutes: number | null = normalizeParsedIdleMinutes()) => {
  idleMinutesLocalOverride.value = minutes
  suppressingIdleMinutesRemoteSync.value = true
}

const normalizeParsedIdleMinutes = (): number | null => {
  const n = Number(dynamicMinutes.value || '0')

  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return null
  }

  return normalizeCountdownDefaultMinutes(n)
}
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
    clearIdleMinutesLocalOverride()
    return
  }

  const next = cloneUserSettings(savedSettings.value)
  next.workflow.countdownDefaultMinutes = normalized

  try {
    await saveSettings(next)
  } catch (error) {
    // Keep the local override active so stale saved settings do not snap the field back.
    markIdleMinutesAsLocallyEdited(normalized)
    console.warn('[worklog] unable to persist countdown default minutes', error)
  }
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
const timerIsCompleted = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.status === 'completed',
)
/** Match tray: +5/+10 stay available while countdown is running, paused, or completed. */
const timerShowsAddTimeButtons = computed(
  () =>
    snapshot.value.mode === 'countdown' &&
    (timerIsRunning.value || timerIsPaused.value || timerIsCompleted.value),
)
const timerShowsReadOnlyProgress = computed(
  () => timerIsRunning.value || timerIsPaused.value || timerIsCompleted.value,
)
const minuteColumnInteractive = computed(() => !timerIsCompleted.value)

const countdownAddedSeconds = computed(() => {
  if (
    snapshot.value.mode !== 'countdown' ||
    snapshot.value.durationSeconds === null ||
    snapshot.value.originalDurationSeconds === null
  ) {
    return 0
  }

  return Math.max(0, snapshot.value.durationSeconds - snapshot.value.originalDurationSeconds)
})

const countdownAddedSummaryDisplay = computed(() => {
  if (
    countdownAddedSeconds.value <= 0 ||
    snapshot.value.mode !== 'countdown' ||
    snapshot.value.durationSeconds === null
  ) {
    return null
  }

  return `Added ${formatSecondsAsMinSecPhrase(countdownAddedSeconds.value)} (${formatSecondsAsMinSecPhrase(snapshot.value.durationSeconds)} total)`
})

const countdownCompletionGapDisplay = computed(() =>
  snapshot.value.completionGapSeconds !== null && snapshot.value.completionGapSeconds > 0
    ? formatSecondsToMinutesSeconds(snapshot.value.completionGapSeconds)
    : null,
)

const countdownConsumedExtensionDisplay = computed(() =>
  snapshot.value.lastExtensionConsumedSeconds > 0
    ? formatSecondsToMinutesSeconds(snapshot.value.lastExtensionConsumedSeconds)
    : null,
)

const showCountdownSummary = computed(() => {
  if (snapshot.value.mode !== 'countdown') {
    return false
  }

  const hasAdded = countdownAddedSeconds.value > 0
  const hasConsumed = snapshot.value.lastExtensionConsumedSeconds > 0
  const hasCompletionGap =
    snapshot.value.completionGapSeconds !== null && snapshot.value.completionGapSeconds > 0

  return hasAdded || hasConsumed || hasCompletionGap
})

/** Idle UI: hide minutes + ":ss" until preferences finish loading (no flash of ":00"). */
const hideIdleTimeUntilPrefsLoaded = computed(
  () =>
    preferencesDocumentPending.value &&
    !timerIsRunning.value &&
    !timerIsPaused.value &&
    !timerIsCompleted.value,
)

const {
  pointerSessionActive: minutePointerSession,
  dragActive: minuteDragActive,
  onPointerDown: handleMinuteColumnPointerDownBase,
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
      const nextMinutes = Math.max(0, minuteDragBaselineIdleMinutes.value + deltaMinutes)
      markIdleMinutesAsLocallyEdited(nextMinutes > 0 ? nextMinutes : null)
      dynamicMinutes.value = String(nextMinutes)
    }
  },
  onSessionEnd({ deltaMinutes, didDragBeyondThreshold }) {
    if (didDragBeyondThreshold && minuteDragIsActiveTimer.value && deltaMinutes !== 0) {
      void addCountdownMinutes(deltaMinutes)
    }

    if (didDragBeyondThreshold && !minuteDragIsActiveTimer.value) {
      markIdleMinutesAsLocallyEdited()
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

const extendCountdownByFiveMinutes = () => {
  void addCountdownMinutes(5)
}

const extendCountdownByTenMinutes = () => {
  void addCountdownMinutes(10)
}

const handleCancel = async () => {
  await cancel()
  resetIdleMinutesToSavedDefault()
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
    resetIdleMinutesToSavedDefault()

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

const handleMinuteColumnPointerDown = (event: PointerEvent) => {
  if (!minuteColumnInteractive.value) {
    return
  }

  handleMinuteColumnPointerDownBase(event)
}

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
  (nextSnapshot, previousSnapshot) => {
    if (minutePointerSession.value) {
      return
    }

    if (previousSnapshot?.mode === 'countdown' && nextSnapshot.status === 'idle') {
      resetIdleMinutesToSavedDefault()
      return
    }

    const leftCompletedCountdown =
      previousSnapshot?.mode === 'countdown' &&
      previousSnapshot.status === 'completed' &&
      nextSnapshot.mode !== 'countdown'

    if (leftCompletedCountdown) {
      resetIdleMinutesToSavedDefault()
      return
    }

    if (nextSnapshot.mode === 'countdown') {
      if (nextSnapshot.status === 'completed') {
        clearIdleMinutesLocalOverride()
      }

      setDynamicMinutesProgrammatically(nextSnapshot.display.split(':')[0] ?? dynamicMinutes.value)
      idleMinutesHydrated.value = true
    }
  },
  { deep: true },
)

watch(
  () => ({
    pending: preferencesDocumentPending.value,
    doc: rawSettings.value as FirebaseUserSettingsDocument | null | undefined,
  }),
  ({ pending, doc }) => {
    if (timerIsRunning.value || timerIsPaused.value) {
      return
    }

    if (minutePointerSession.value || minuteDragActive.value) {
      return
    }

    if (pending) {
      return
    }

    if (!doc) {
      if (suppressingIdleMinutesRemoteSync.value) {
        const local = idleMinutesLocalOverride.value

        if (local === null) {
          return
        }

        const remote = savedSettings.value.workflow.countdownDefaultMinutes

        if (remote !== local) {
          return
        }

        clearIdleMinutesLocalOverride()
      }

      setDynamicMinutesProgrammatically(
        String(savedSettings.value.workflow.countdownDefaultMinutes),
      )
      idleMinutesHydrated.value = true

      return
    }

    const remote = toUserSettings(doc as FirebaseUserSettingsDocument).workflow
      .countdownDefaultMinutes

    if (suppressingIdleMinutesRemoteSync.value) {
      const local = idleMinutesLocalOverride.value

      if (local === null) {
        return
      }

      if (remote !== local) {
        return
      }

      clearIdleMinutesLocalOverride()
    }

    setDynamicMinutesProgrammatically(String(remote))
    idleMinutesHydrated.value = true
  },
  { deep: true, immediate: true },
)

watch(dynamicMinutes, () => {
  if (timerIsRunning.value || timerIsPaused.value || minutePointerSession.value) {
    return
  }

  if (applyingProgrammaticDynamicMinutes.value) {
    return
  }

  if (!idleMinutesHydrated.value) {
    return
  }

  markIdleMinutesAsLocallyEdited()
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
    class="relative flex w-full items-center justify-between gap-7 rounded-sm pt-7 pb-4"
    padding="comfortable"
    variant="timer"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <div
        class="relative flex h-14 shrink-0 items-center rounded-sm border border-button-secondary-border bg-button-secondary px-2.5 font-data text-5xl leading-none font-bold whitespace-nowrap text-button-secondary-text tabular-nums"
      >
        <TimerCancelButton @click="handleCancel" />
        <div
          class="flex touch-none flex-nowrap items-center self-stretch"
          :class="
            minuteDragActive
              ? 'cursor-grabbing select-none'
              : minuteColumnInteractive
                ? 'cursor-ns-resize'
                : 'cursor-default'
          "
          @pointerdown="handleMinuteColumnPointerDown"
        >
          <template v-if="!hideIdleTimeUntilPrefsLoaded">
            <div>
              <input
                v-if="!timerShowsReadOnlyProgress"
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
          </template>
        </div>
      </div>
      <div v-if="timerShowsAddTimeButtons" class="flex h-14 shrink-0 flex-col justify-center gap-2">
        <AppButton
          data-testid="countdown-add-5"
          size="xs"
          variant="secondary"
          @click="extendCountdownByFiveMinutes"
        >
          +5 min
        </AppButton>
        <AppButton
          data-testid="countdown-add-10"
          size="xs"
          variant="secondary"
          @click="extendCountdownByTenMinutes"
        >
          +10 min
        </AppButton>
      </div>
      <div
        v-if="showCountdownSummary"
        class="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left text-xs leading-tight text-text-muted"
      >
        <span v-if="countdownConsumedExtensionDisplay && !timerIsCompleted">
          {{ countdownConsumedExtensionDisplay }} elapsed untracked
        </span>
        <span v-if="countdownAddedSummaryDisplay">
          {{ countdownAddedSummaryDisplay }}
        </span>
        <span v-if="timerIsCompleted && countdownCompletionGapDisplay">
          {{ countdownCompletionGapDisplay }} elapsed since completion
        </span>
        <span
          v-else-if="
            countdownConsumedExtensionDisplay && timerIsCompleted && !countdownCompletionGapDisplay
          "
        >
          {{ countdownConsumedExtensionDisplay }} of the added time had already elapsed
        </span>
      </div>
    </div>
    <div class="flex shrink-0 flex-col items-end gap-2">
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <TimerButton
          v-if="!timerIsRunning && !timerIsPaused && !timerIsCompleted"
          @click="startTimer"
        >
          Start
        </TimerButton>
        <TimerButton v-if="timerIsRunning && !timerIsPaused" @click="pause">Pause</TimerButton>
        <TimerButton v-if="timerIsPaused" @click="resume">Resume</TimerButton>
      </div>
    </div>
    <span
      class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-sm leading-none font-semibold tracking-wide text-text opacity-80"
      aria-hidden="true"
    >
      Countdown
    </span>
  </ContainerCard>
</template>
