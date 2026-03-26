<script setup lang="ts">
withDefaults(
  defineProps<{
    bodyPaddingClass?: string
    overlay?: boolean
  }>(),
  {
    bodyPaddingClass: 'px-4 pt-4 pb-4',
    overlay: false,
  },
)
</script>

<template>
  <ContainerCard
    as="aside"
    class="flex h-full w-full min-w-0 shrink-0 flex-col"
    :class="
      overlay
        ? 'bg-surface/85'
        : 'max-w-108 rounded-none border-y-0 border-r-0 border-l border-border bg-surface-strong'
    "
    padding="none"
    :variant="overlay ? 'overlay' : 'subtle'"
  >
    <div v-if="$slots.header" class="shrink-0">
      <slot name="header" />
    </div>

    <div v-if="$slots.subheader" class="shrink-0">
      <slot name="subheader" />
    </div>

    <div class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
      <div class="flex h-full min-h-full min-w-0 flex-col" :class="bodyPaddingClass">
        <slot />
      </div>
    </div>
  </ContainerCard>
</template>
