<script setup lang="ts">
const { snapshot, cancel, startCountup, stop } = useTimerService()

const timerProgress = computed(() => {
  if (snapshot.value.mode !== 'countup') {
    return '00:00'
  }

  return snapshot.value.display
})

const timerIsRunning = computed(
  () => snapshot.value.mode === 'countup' && snapshot.value.status === 'running',
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
      {{ timerProgress }}
    </div>

    <TimerButton v-if="!timerIsRunning" @click="startCountup">Start Timer</TimerButton>
    <TimerButton v-else @click="stop">Stop Timer</TimerButton>
  </div>
</template>
