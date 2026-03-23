<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  variant: { type: String, default: undefined },
  highlightTokens: { type: Array as PropType<string[]>, default: () => [] },
  flushTop: { type: Boolean, default: false },
})

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
    :flush-top="props.flushTop"
    :highlight-tokens="highlightTokens"
    :variant
    :is-minimized
    @toggle-editor="toggleEditor"
  />
  <TimeBoxEditor v-if="showEditor" :id @toggle-editor="toggleEditor" />
</template>
