<script setup lang="ts">
const { projectDocumentId } = useResolvedProjectDocumentId('legacy-project-route')
</script>

<template>
  <ProjectOverview v-if="projectDocumentId" :id="projectDocumentId" :key="projectDocumentId" />
</template>
