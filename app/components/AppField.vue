<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import {
  getAppFieldRootClassName,
  type AppFieldDensity,
  type AppFieldLabelVariant,
} from '~/utils/app-field'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: 'div' | 'label'
    density?: AppFieldDensity
    label?: string
    labelVariant?: AppFieldLabelVariant
  }>(),
  {
    as: undefined,
    density: 'compact',
    label: undefined,
    labelVariant: 'default',
  },
)

const attrs = useAttrs() as HTMLAttributes

const rootTag = computed(() => {
  if (props.as) {
    return props.as
  }

  return props.label ? 'label' : 'div'
})

const rootAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [
  getAppFieldRootClassName({ density: props.density }),
  attrs.class,
])
</script>

<template>
  <component :is="rootTag" v-bind="rootAttrs" :class="className">
    <AppFieldLabel v-if="label" :variant="labelVariant">{{ label }}</AppFieldLabel>
    <slot name="description" />
    <slot />
    <slot name="hint" />
  </component>
</template>
