<script setup lang="ts">
const { state, dismiss, onAfterLeave } = useOverlayToast()
</script>

<template>
  <OverlayToast
    :open="state.open"
    :title="state.title"
    :message="state.message"
    @dismiss="dismiss"
    @after-leave="onAfterLeave"
  />
</template>
