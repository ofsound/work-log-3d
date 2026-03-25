<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import { getAppToggleChipClassName } from '~/utils/app-field'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  selected: boolean
}>()

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [
  getAppToggleChipClassName({ selected: props.selected }),
  attrs.class,
])
</script>

<template>
  <label v-bind="rootAttrs" :class="className">
    <slot />
  </label>
</template>
