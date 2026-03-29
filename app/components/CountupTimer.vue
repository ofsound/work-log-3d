<script setup lang="ts">
const { isReady, snapshot, cancel, resume, startCountup, stop } = useTimerService()

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
const countupParts = computed(() => {
  const [mins = '00', secs = '00'] = timerProgress.value.split(':')

  return { mins, secs }
})
</script>

<template>
  <ContainerCard
    class="relative flex w-full flex-nowrap items-center justify-between gap-7 rounded-sm pt-7 pb-4"
    :class="!isReady ? 'pointer-events-none opacity-60' : ''"
    padding="comfortable"
    variant="timer"
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
      <TimerButton v-if="isReady && !timerIsRunning && !timerIsPaused" @click="startCountup">
        Start
      </TimerButton>
      <TimerButton v-if="isReady && timerIsRunning" @click="stop">Stop</TimerButton>
      <TimerButton v-if="isReady && timerIsPaused" @click="resume">Resume</TimerButton>
    </div>
    <span
      class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-sm leading-none font-semibold tracking-wide text-text opacity-80"
      aria-hidden="true"
    >
      Timer
    </span>
  </ContainerCard>
</template>
