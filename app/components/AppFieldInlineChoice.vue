<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import { APP_FIELD_INLINE_CHOICE_CLASS_NAME } from '~/utils/app-field'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [APP_FIELD_INLINE_CHOICE_CLASS_NAME, attrs.class])
</script>

<template>
  <label v-bind="rootAttrs" :class="className">
    <slot />
  </label>
</template>
