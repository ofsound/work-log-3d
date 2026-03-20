<script setup lang="ts">
const { snapshot } = useTimerService()

const countUpIsActive = computed(() => snapshot.value.mode === 'countup' && snapshot.value.isActive)
const countDownIsActive = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.isActive,
)

const startTimeFromTimer = computed(() => {
  if (snapshot.value.startedAtMs === null) {
    return ''
  }

  return formatToDatetimeLocal(new Date(snapshot.value.startedAtMs))
})

const endTimeFromTimer = computed(() => {
  if (snapshot.value.endedAtMs === null) {
    return ''
  }

  return formatToDatetimeLocal(new Date(snapshot.value.endedAtMs))
})
</script>

<template>
  <div class="flex gap-2 *:flex-1">
    <CountdownTimer :class="{ 'blur-[2px] grayscale-100': countUpIsActive }" />
    <CountupTimer :class="{ 'blur-[2px] grayscale-100': countDownIsActive }" />
  </div>
  <TimeBoxEditor
    :start-time-from-timer="startTimeFromTimer"
    :end-time-from-timer="endTimeFromTimer"
  />
</template>
