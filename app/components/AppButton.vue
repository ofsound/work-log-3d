<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import {
  getAppButtonClassName,
  type AppButtonShape,
  type AppButtonSize,
  type AppButtonVariant,
} from '~/utils/app-button'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    block?: boolean
    shape?: AppButtonShape
    size?: AppButtonSize
    type?: 'button' | 'submit' | 'reset'
    variant?: AppButtonVariant
  }>(),
  {
    block: false,
    shape: 'rounded',
    size: 'md',
    type: 'button',
    variant: 'secondary',
  },
)

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...(attrs as Record<string, unknown>) }

  delete nextAttrs.class
  delete nextAttrs.type

  return nextAttrs
})

const className = computed(() => [
  getAppButtonClassName({
    block: props.block,
    shape: props.shape,
    size: props.size,
    variant: props.variant,
  }),
  attrs.class,
])
</script>

<template>
  <button v-bind="rootAttrs" :type="props.type" :class="className">
    <slot />
  </button>
</template>
