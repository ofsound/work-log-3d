<script setup lang="ts">
import {
  TIMER_PRIMARY_ACTION_MAX_SM_CLASSES,
  TIMER_READOUT_MAX_SM_CENTER_WRAPPER_CLASSES,
  TIMER_READOUT_SHELL_CLASSES,
} from '~/utils/timer-readout'

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
    class="relative flex w-full flex-nowrap items-center justify-between gap-3 rounded-sm pt-10 pb-4 sm:gap-7 sm:pt-7"
    :class="!isReady ? 'pointer-events-none opacity-60' : ''"
    padding="comfortable"
    variant="timer"
  >
    <div :class="TIMER_READOUT_SHELL_CLASSES">
      <TimerCancelButton @click="cancel" />
      <div :class="TIMER_READOUT_MAX_SM_CENTER_WRAPPER_CLASSES">
        <div class="flex flex-nowrap items-center">
          {{ countupParts.mins }}<span class="relative -top-1">:</span>{{ countupParts.secs }}
        </div>
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
