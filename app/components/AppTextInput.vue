<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import { getAppFieldControlClassName, type AppFieldDensity } from '~/utils/app-field'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    density?: AppFieldDensity
  }>(),
  {
    density: 'compact',
  },
)

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...(attrs as Record<string, unknown>) }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [
  getAppFieldControlClassName({ density: props.density, multiline: false }),
  attrs.class,
])
</script>

<template>
  <input v-bind="rootAttrs" :class="className" />
</template>
