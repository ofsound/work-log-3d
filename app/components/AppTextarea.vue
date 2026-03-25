<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import { getAppFieldControlClassName, type AppFieldDensity } from '~/utils/app-field'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    density?: AppFieldDensity
    /** `v-model` (two-way binding). */
    modelValue?: string | number | null
    /** One-way controlled value (`:value` without `v-model`). */
    value?: string | number | null
  }>(),
  {
    density: 'compact',
    modelValue: undefined,
    value: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  input: [event: Event]
}>()

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...(attrs as Record<string, unknown>) }
  delete nextAttrs.class
  delete nextAttrs.onInput
  return nextAttrs
})

const className = computed(() => [
  getAppFieldControlClassName({ density: props.density, multiline: true }),
  attrs.class,
])

const nativeValue = computed(() => {
  if (props.modelValue !== undefined && props.modelValue !== null) {
    return String(props.modelValue)
  }
  if (props.value !== undefined && props.value !== null) {
    return String(props.value)
  }
  return ''
})

function onInput(event: Event) {
  const next = (event.target as HTMLTextAreaElement).value
  emit('update:modelValue', next)
  emit('input', event)
}
</script>

<template>
  <textarea :value="nativeValue" :class="className" v-bind="rootAttrs" @input="onInput"></textarea>
</template>
