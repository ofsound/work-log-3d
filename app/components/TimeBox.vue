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
  <div :class="embeddedInPanel ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'contents'">
    <TimeBoxViewer
      v-if="!showEditor"
      :id
      :class="embeddedInPanel ? 'min-h-0 min-w-0 flex-1 overflow-y-auto' : undefined"
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
      class="min-h-0 min-w-0 flex-1"
      @toggle-editor="toggleEditor"
    />
  </div>
</template>
