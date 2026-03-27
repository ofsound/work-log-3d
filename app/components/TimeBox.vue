<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  variant: { type: String, default: undefined },
  interactive: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  /** Tighter vertical spacing between minimized session rows (project list view). */
  compact: { type: Boolean, default: false },
  highlightTokens: { type: Array as PropType<string[]>, default: () => [] },
  hideProjectChip: { type: Boolean, default: false },
  flushTop: { type: Boolean, default: false },
  opaqueSurface: { type: Boolean, default: false },
  hideActions: { type: Boolean, default: false },
  useProjectCardStyles: { type: Boolean, default: true },
  embeddedInPanel: { type: Boolean, default: false },
})

const emit = defineEmits(['deleted', 'open'])

const showEditor = ref(false)

const isMinimized = ref(false)

if (props.variant === 'project') {
  isMinimized.value = true
}

const toggleEditor = () => {
  showEditor.value = !showEditor.value
}
</script>

<template>
  <div :class="embeddedInPanel ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'contents'">
    <div v-if="!showEditor" :class="embeddedInPanel ? 'min-h-0 min-w-0 flex-1 px-4' : 'contents'">
      <TimeBoxViewer
        :id
        :class="embeddedInPanel ? 'min-h-0 min-w-0 flex-1' : undefined"
        :compact="props.compact"
        :flush-top="props.flushTop"
        :highlight-tokens="highlightTokens"
        :hide-actions="hideActions"
        :hide-project-chip="hideProjectChip"
        :interactive="props.interactive"
        :opaque-surface="opaqueSurface"
        :selected="props.selected"
        :use-project-card-styles="props.useProjectCardStyles"
        :variant
        :is-minimized
        @deleted="emit('deleted')"
        @open="emit('open')"
        @toggle-editor="toggleEditor"
      />
    </div>
    <div v-if="showEditor" :class="embeddedInPanel ? 'min-h-0 min-w-0 flex-1' : 'contents'">
      <TimeBoxEditor
        :id
        :embedded-in-panel="embeddedInPanel"
        class="min-h-0 min-w-0 flex-1"
        @toggle-editor="toggleEditor"
      />
    </div>
  </div>
</template>
