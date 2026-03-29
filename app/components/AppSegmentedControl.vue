<script setup lang="ts">
import { computed } from 'vue'

interface AppSegmentedControlItem {
  id: string
  label: string
}

const props = withDefaults(
  defineProps<{
    activeId: string
    ariaLabel?: string
    /** With `size="large"`, use medium styling below `sm` and large from `sm` up. */
    compactBelowSm?: boolean
    items: AppSegmentedControlItem[]
    size?: 'large' | 'medium'
  }>(),
  {
    ariaLabel: undefined,
    compactBelowSm: false,
    size: 'large',
  },
)

const emit = defineEmits<{
  select: [id: string]
}>()

const SEGMENTED_CONTROL_SIZE_CLASS_NAMES = {
  large: {
    button: 'rounded-lg px-4 py-2 text-sm',
    container: 'rounded-xl p-1',
  },
  medium: {
    button: 'rounded-md px-3 py-1.5 text-xs',
    container: 'rounded-lg p-0.5',
  },
} as const

const ACTIVE_BUTTON_CLASS_NAME =
  'cursor-pointer bg-[light-dark(color-mix(in_srgb,var(--color-surface)_74%,var(--color-header)_26%),color-mix(in_srgb,var(--color-header)_92%,var(--color-black)_8%))] text-[light-dark(var(--color-zinc-900),var(--color-zinc-100))]'
const INACTIVE_BUTTON_CLASS_NAME =
  'cursor-pointer text-text-muted hover:text-text hover:bg-[linear-gradient(135deg,_color-mix(in_srgb,var(--color-surface-strong)_96%,var(--color-header)_4%),_color-mix(in_srgb,var(--color-surface-strong)_92%,var(--color-header)_8%))]'

const BUTTON_CHROME_CLASS_NAME =
  'font-semibold transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none'

const containerClassName = computed(() => {
  const shell = 'inline-flex border border-border bg-surface-strong shadow-control'
  if (props.compactBelowSm && props.size === 'large') {
    return `${shell} rounded-lg p-0.5 sm:rounded-xl sm:p-1`
  }
  return `${shell} ${SEGMENTED_CONTROL_SIZE_CLASS_NAMES[props.size].container}`
})

const buttonClassName = computed(() => {
  if (props.compactBelowSm && props.size === 'large') {
    return `${BUTTON_CHROME_CLASS_NAME} rounded-md px-3 py-1.5 text-xs sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm`
  }
  return `${BUTTON_CHROME_CLASS_NAME} ${SEGMENTED_CONTROL_SIZE_CLASS_NAMES[props.size].button}`
})

const getItemClassName = (id: string) =>
  `${buttonClassName.value} ${id === props.activeId ? ACTIVE_BUTTON_CLASS_NAME : INACTIVE_BUTTON_CLASS_NAME}`
</script>

<template>
  <div :aria-label="ariaLabel" :class="containerClassName" role="group">
    <button
      v-for="item in items"
      :key="item.id"
      :aria-pressed="item.id === activeId"
      :class="getItemClassName(item.id)"
      type="button"
      @click="emit('select', item.id)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
