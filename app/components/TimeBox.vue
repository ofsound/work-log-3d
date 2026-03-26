<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  variant: { type: String, default: undefined },
  /** Tighter vertical spacing between minimized session rows (project list view). */
  compact: { type: Boolean, default: false },
  highlightTokens: { type: Array as PropType<string[]>, default: () => [] },
  flushTop: { type: Boolean, default: false },
  opaqueSurface: { type: Boolean, default: false },
  embeddedInPanel: { type: Boolean, default: false },
})

const emit = defineEmits(['deleted'])

const showEditor = ref(false)

const isMinimized = ref(false)

if (props.variant === 'project' || props.variant === 'tag') {
  isMinimized.value = true
}

const toggleEditor = () => {
  showEditor.value = !showEditor.value
}
</script>

<template>
  <TimeBoxViewer
    v-if="!showEditor"
    :id
    :compact="props.compact"
    :flush-top="props.flushTop"
    :highlight-tokens="highlightTokens"
    :opaque-surface="opaqueSurface"
    :variant
    :is-minimized
    @deleted="emit('deleted')"
    @toggle-editor="toggleEditor"
  />
  <TimeBoxEditor
    v-if="showEditor"
    :id
    :embedded-in-panel="embeddedInPanel"
    @toggle-editor="toggleEditor"
  />
</template>
