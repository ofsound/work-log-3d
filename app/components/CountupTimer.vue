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
    class="flex w-full items-center justify-between rounded-sm border border-border-subtle bg-panel-timer px-6 py-4 shadow-panel"
    style="width: 100%; min-width: 100%"
  >
    <div
      class="relative h-max rounded-sm border border-button-secondary-border bg-button-secondary px-2.5 py-1 font-data text-5xl font-bold text-button-secondary-text tabular-nums"
    >
      <TimerCancelButton @click="cancel" />
      {{ timerProgress }}
    </div>

    <TimerButton v-if="!timerIsRunning" @click="startCountup">Start Timer</TimerButton>
    <TimerButton v-else @click="stop">Stop Timer</TimerButton>
  </div>
</template>
