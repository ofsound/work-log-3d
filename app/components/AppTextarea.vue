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
  const nextAttrs = { ...attrs }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [
  getAppFieldControlClassName({ density: props.density, multiline: true }),
  attrs.class,
])
</script>

<template>
  <textarea v-bind="rootAttrs" :class="className"></textarea>
</template>
