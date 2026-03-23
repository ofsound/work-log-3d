<script setup lang="ts">
const { isReady, snapshot, addCountdownMinutes, cancel, pause, resume, startCountdown } =
  useTimerService()
const dynamicMinutes = ref('30')
const route = useRoute()
const hasStartedPomodoro = ref(false)

const updateDraftMinutes = (minutesToAdd: number) => {
  const currentMinutes = Number(dynamicMinutes.value || '0')
  const nextMinutes = (Number.isFinite(currentMinutes) ? currentMinutes : 0) + minutesToAdd

  dynamicMinutes.value = String(nextMinutes)
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
const secondsProgress = computed(() => {
  if (snapshot.value.mode !== 'countdown') {
    return '00'
  }

  return snapshot.value.display.split(':')[1] ?? '00'
})

watch(
  () => snapshot.value,
  (nextSnapshot) => {
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
  <div
    class="flex w-full flex-nowrap items-center justify-between gap-7 rounded-sm border border-border-subtle bg-panel-timer px-6 py-4 shadow-panel"
  >
    <div class="flex shrink-0 items-center gap-3">
      <div
        class="relative flex h-14 shrink-0 items-center rounded-sm border border-button-secondary-border bg-button-secondary px-2.5 font-data text-5xl leading-none font-bold whitespace-nowrap text-button-secondary-text tabular-nums"
      >
        <TimerCancelButton @click="cancel" />
        <div class="flex flex-nowrap items-center">
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
            {{ snapshot.display.split(':')[0] }}
          </div>
          <span class="relative -top-1">:</span>
          {{ secondsProgress }}
        </div>
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
    <TimerButton v-if="!timerIsRunning && !timerIsPaused" class="shrink-0" @click="startTimer"
      >Start Timer</TimerButton
    >
    <TimerButton v-if="timerIsRunning && !timerIsPaused" class="shrink-0" @click="pause"
      >Pause Timer</TimerButton
    >
    <TimerButton v-if="timerIsPaused" class="shrink-0" @click="resume">Resume Timer </TimerButton>
  </div>
</template>
