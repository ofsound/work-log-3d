<script setup lang="ts">
const { projectDocumentId } = useResolvedProjectDocumentId('legacy-project-edit-route')
</script>

<template>
  <ProjectEditorWorkspace v-if="projectDocumentId" :id="projectDocumentId" />
</template>
