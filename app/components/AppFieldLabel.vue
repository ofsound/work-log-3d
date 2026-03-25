<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import { getAppFieldLabelClassName, type AppFieldLabelVariant } from '~/utils/app-field'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: 'div' | 'legend' | 'span'
    variant?: AppFieldLabelVariant
  }>(),
  {
    as: 'span',
    variant: 'default',
  },
)

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [
  getAppFieldLabelClassName({ variant: props.variant }),
  attrs.class,
])
</script>

<template>
  <component :is="as" v-bind="rootAttrs" :class="className">
    <slot />
  </component>
</template>
