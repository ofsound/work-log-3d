<script setup lang="ts">
import { ref } from 'vue'

import TimeBoxViewer from '@/components/TimeBoxViewer.vue'
import TimeBoxEditor from '@/components/TimeBoxEditor.vue'

const props = defineProps({
  id: { type: String, required: true },
  variant: { type: String, default: undefined },
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
  <TimeBoxViewer v-if="!showEditor" :id :variant :is-minimized @toggle-editor="toggleEditor" />
  <TimeBoxEditor v-if="showEditor" :id @toggle-editor="toggleEditor" />
</template>
