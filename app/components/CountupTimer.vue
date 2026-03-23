<script setup lang="ts">
const { snapshot, cancel, pause, resume, startCountup, stop } = useTimerService()

const timerProgress = computed(() => {
  if (snapshot.value.mode !== 'countup') {
    return '00:00'
  }

  return snapshot.value.display
})

const timerIsRunning = computed(
  () => snapshot.value.mode === 'countup' && snapshot.value.status === 'running',
)
const timerIsPaused = computed(
  () => snapshot.value.mode === 'countup' && snapshot.value.status === 'paused',
)
const showCountupStop = computed(() => snapshot.value.mode === 'countup')

const countupParts = computed(() => {
  const [mins = '00', secs = '00'] = timerProgress.value.split(':')

  return { mins, secs }
})
</script>

<template>
  <div
    class="flex w-full flex-nowrap items-center justify-between gap-7 rounded-sm border border-border-subtle bg-panel-timer px-6 py-4 shadow-panel"
  >
    <div
      class="relative flex h-14 shrink-0 items-center rounded-sm border border-button-secondary-border bg-button-secondary px-2.5 font-data text-5xl leading-none font-bold whitespace-nowrap text-button-secondary-text tabular-nums"
    >
      <TimerCancelButton @click="cancel" />
      <div class="flex flex-nowrap items-center">
        {{ countupParts.mins }}<span class="relative -top-1">:</span>{{ countupParts.secs }}
      </div>
    </div>

    <div class="flex shrink-0 flex-nowrap items-center gap-2">
      <TimerButton v-if="!timerIsRunning && !timerIsPaused" @click="startCountup"
        >Start Timer</TimerButton
      >
      <TimerButton v-if="timerIsRunning && !timerIsPaused" @click="pause">Pause Timer</TimerButton>
      <TimerButton v-if="timerIsPaused" @click="resume">Resume Timer </TimerButton>
      <TimerButton v-if="showCountupStop" @click="stop">Stop Timer</TimerButton>
    </div>
  </div>
</template>
