<script setup lang="ts">
const { state, finish } = useConfirmDialog()
</script>

<template>
  <ConfirmDialog
    :open="state.open"
    :title="state.title"
    :message="state.message"
    :confirm-label="state.confirmLabel"
    :cancel-label="state.cancelLabel"
    :variant="state.variant"
    :title-id="state.titleId"
    @confirm="finish(true)"
    @cancel="finish(false)"
  />
</template>
