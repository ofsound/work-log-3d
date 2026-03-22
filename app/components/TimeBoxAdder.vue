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
  <div class="flex flex-col gap-6">
    <div class="grid gap-4 lg:grid-cols-2">
      <CountdownTimer :class="{ 'blur-[2px] grayscale-100': countUpIsActive }" />
      <CountupTimer :class="{ 'blur-[2px] grayscale-100': countDownIsActive }" />
    </div>

    <TimeBoxEditor
      :start-time-from-timer="startTimeFromTimer"
      :end-time-from-timer="endTimeFromTimer"
    />
  </div>
</template>
