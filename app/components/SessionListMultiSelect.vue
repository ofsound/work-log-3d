<script setup lang="ts">
import type { CSSProperties } from 'vue'

interface SessionListMultiSelectOption {
  id: string
  label: string
  swatchStyle?: CSSProperties
}

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string[]
    options: SessionListMultiSelectOption[]
    placeholder: string
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const rootElement = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const isOpen = ref(false)

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const selectedOptionLabels = computed(() =>
  props.options
    .filter((option) => props.modelValue.includes(option.id))
    .map((option) => option.label),
)
const summaryLabel = computed(() => {
  if (selectedOptionLabels.value.length === 0) {
    return props.placeholder
  }

  if (selectedOptionLabels.value.length <= 2) {
    return selectedOptionLabels.value.join(', ')
  }

  return `${selectedOptionLabels.value.length} selected`
})
const visibleOptions = computed(() => {
  if (!normalizedSearchQuery.value) {
    return props.options
  }

  return props.options.filter((option) =>
    option.label.toLowerCase().includes(normalizedSearchQuery.value),
  )
})

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const toggleOpen = async () => {
  if (props.disabled) {
    return
  }

  isOpen.value = !isOpen.value

  if (isOpen.value) {
    await nextTick()
    searchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
}

const toggleValue = (id: string) => {
  const nextValues = new Set(props.modelValue)

  if (nextValues.has(id)) {
    nextValues.delete(id)
  } else {
    nextValues.add(id)
  }

  emit(
    'update:modelValue',
    props.options.filter((option) => nextValues.has(option.id)).map((option) => option.id),
  )
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!rootElement.value || !(event.target instanceof Node)) {
    return
  }

  if (!rootElement.value.contains(event.target)) {
    close()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      close()
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<template>
  <div ref="rootElement" class="relative flex min-w-0 flex-col gap-2">
    <div class="text-sm font-semibold text-text">{{ label }}</div>
    <button
      type="button"
      class="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-input-border bg-input px-3 py-2 text-left text-sm text-text"
      :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
      :disabled="disabled"
      @click="toggleOpen"
    >
      <span class="min-w-0 truncate" :class="modelValue.length === 0 ? 'text-text-muted' : ''">
        {{ summaryLabel }}
      </span>
      <span class="shrink-0 text-text-subtle">{{ isOpen ? 'Close' : 'Select' }}</span>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full right-0 left-0 z-20 mt-2 flex max-h-80 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface px-3 py-3 shadow-panel"
    >
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="rounded-xl border border-input-border bg-input px-3 py-2 text-sm text-text"
        :placeholder="`Search ${label.toLowerCase()}`"
        @keydown="handleEscape"
      />

      <div class="max-h-52 overflow-auto">
        <div v-if="visibleOptions.length === 0" class="px-2 py-3 text-sm text-text-muted">
          No matches
        </div>
        <label
          v-for="option in visibleOptions"
          :key="option.id"
          class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-text hover:bg-surface-subtle"
        >
          <input
            :checked="modelValue.includes(option.id)"
            type="checkbox"
            @change="toggleValue(option.id)"
          />
          <span
            v-if="option.swatchStyle"
            class="size-3.5 shrink-0 rounded-full border border-white/25"
            :style="option.swatchStyle"
          ></span>
          <span class="min-w-0 truncate">{{ option.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
