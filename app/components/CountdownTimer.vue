<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

import { formatSecondsToMinutesSecondsParts } from '@/utils/formatters'

const emit = defineEmits(['setStartTime', 'setEndTime', 'resetStartAndEndTimes'])

const timerIsRunning = ref(false)
const timerIsPaused = ref(false)
const timerProgress = ref('')
const secondsProgress = ref('00')
const timerLength = ref(1800)

const dynamicMinutes = ref('30')

let nowWhenStarted: Date

let timerInterval: ReturnType<typeof setInterval>

const startTimer = () => {
  nowWhenStarted = new Date()
  updateTime()
  timerInterval = setInterval(updateTime, 1000)
  emit('setStartTime', new Date(), 'countdown')
  timerIsRunning.value = true
}

const pauseTimer = () => {
  timerIsPaused.value = true
}

const resumeTimer = () => {
  timerIsPaused.value = false
}

const cancelTimer = () => {
  timerIsRunning.value = false
  emit('resetStartAndEndTimes')
}

const stopTimer = () => {
  clearInterval(timerInterval)
  emit('setEndTime', new Date())
  timerIsRunning.value = false
}

const updateTime = () => {
  const now = new Date()

  const timeElapsedSinceStart = now.valueOf() - nowWhenStarted.valueOf()

  const secondsElapsed = Math.round(timeElapsedSinceStart / 1000)

  if (timerLength.value - secondsElapsed <= 0) {
    stopTimer()
  }

  const { formattedMinutes, formattedSeconds } = formatSecondsToMinutesSecondsParts(
    timerLength.value - secondsElapsed,
  )

  timerProgress.value = formattedMinutes + ':' + formattedSeconds

  dynamicMinutes.value = formattedMinutes

  secondsProgress.value = formattedSeconds
}

watch(
  () => dynamicMinutes.value,
  () => {
    if (!timerIsRunning.value) {
      timerLength.value = 60 * parseInt(dynamicMinutes.value)
    }
  },
)

onMounted(() => {
  const route = useRoute()
  if (route.path === '/pomodoro') {
    startTimer()
  }
})
</script>

<template>
  <div
    class="my-4 flex max-w-90 items-center justify-between rounded-sm border border-gray-400/30 bg-green-400 px-6 py-4 shadow-md"
  >
    <div
      class="relative h-max rounded-sm border border-gray-300 bg-white px-2.5 py-1 font-data text-5xl font-bold tabular-nums"
    >
      <TimerCancelButton @click="cancelTimer" />
      <div class="flex items-baseline">
        <input
          id="dynamicMinutes"
          v-model="dynamicMinutes"
          type="text"
          class="w-14"
          @keyup.enter="($event.target as HTMLElement).blur()"
          @keyup.esc="($event.target as HTMLElement).blur()"
        />
        <div class="relative -top-1">:</div>
        {{ secondsProgress }}
      </div>
    </div>
    <TimerButton v-if="!timerIsRunning" @click="startTimer">Start Timer</TimerButton>
    <TimerButton v-if="timerIsRunning && !timerIsPaused" @click="pauseTimer"
      >Pause Timer</TimerButton
    >
    <TimerButton v-if="timerIsPaused" @click="resumeTimer">Resume Timer </TimerButton>
  </div>
</template>
