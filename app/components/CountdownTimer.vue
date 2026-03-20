<script setup lang="ts">
const { isReady, snapshot, cancel, pause, resume, startCountdown } = useTimerService()
const dynamicMinutes = ref('30')
const route = useRoute()
const hasStartedPomodoro = ref(false)

const startTimer = () => {
  void startCountdown(Number(dynamicMinutes.value || '0'))
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
    class="my-4 flex max-w-90 items-center justify-between rounded-sm border border-gray-400/30 bg-green-400 px-6 py-4 shadow-md"
  >
    <div
      class="relative h-max rounded-sm border border-gray-300 bg-white px-2.5 py-1 font-data text-5xl font-bold tabular-nums"
    >
      <TimerCancelButton @click="cancel" />
      <div class="flex items-baseline">
        <input
          v-if="!timerIsRunning && !timerIsPaused"
          id="dynamicMinutes"
          v-model="dynamicMinutes"
          type="text"
          class="w-14"
          @keyup.enter="($event.target as HTMLElement).blur()"
          @keyup.esc="($event.target as HTMLElement).blur()"
        />
        <div v-else class="w-14 text-right">{{ snapshot.display.split(':')[0] }}</div>
        <div class="relative -top-1">:</div>
        {{ secondsProgress }}
      </div>
    </div>
    <TimerButton v-if="!timerIsRunning && !timerIsPaused" @click="startTimer"
      >Start Timer</TimerButton
    >
    <TimerButton v-if="timerIsRunning && !timerIsPaused" @click="pause">Pause Timer</TimerButton>
    <TimerButton v-if="timerIsPaused" @click="resume">Resume Timer </TimerButton>
  </div>
</template>
