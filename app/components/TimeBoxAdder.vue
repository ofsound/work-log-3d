<script setup lang="ts">
import { ref } from 'vue'

import { formatToDatetimeLocal } from '@/utils/formatters'

const countUpIsActive = ref(false)
const countDownIsActive = ref(false)

const startTimeFromTimer = ref()
const endTimeFromTimer = ref()

const setStartTime = (timeFromTimer: Date, source: string) => {
  startTimeFromTimer.value = formatToDatetimeLocal(timeFromTimer)
  if (source === 'countup') {
    countUpIsActive.value = true
  } else if (source === 'countdown') {
    countDownIsActive.value = true
  }
}

const setEndTime = (timeFromTimer: Date) => {
  endTimeFromTimer.value = formatToDatetimeLocal(timeFromTimer)
}

const resetStartAndEndTimes = () => {
  startTimeFromTimer.value = ''
  endTimeFromTimer.value = ''
  countUpIsActive.value = false
  countDownIsActive.value = false
}
</script>

<template>
  <div class="flex gap-2 *:flex-1">
    <CountdownTimer
      :class="{ 'blur-[2px] grayscale-100': countUpIsActive }"
      @set-start-time="setStartTime"
      @set-end-time="setEndTime"
      @reset-start-and-end-times="resetStartAndEndTimes"
    />
    <CountupTimer
      :class="{ 'blur-[2px] grayscale-100': countDownIsActive }"
      @set-start-time="setStartTime"
      @set-end-time="setEndTime"
      @reset-start-and-end-times="resetStartAndEndTimes"
    />
  </div>
  <TimeBoxEditor
    :start-time-from-timer="startTimeFromTimer"
    :end-time-from-timer="endTimeFromTimer"
  />
</template>
