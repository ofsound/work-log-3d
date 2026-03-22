<script setup lang="ts">
const route = useRoute()

const projectId = computed(() => {
  const value = route.params.id
  return Array.isArray(value) ? value[0] : (value ?? '')
})
</script>

<template>
  <ProjectEditorWorkspace v-if="projectId" :id="projectId" />
</template>
