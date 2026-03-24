<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-workspace' })

const { projectDocumentId } = useResolvedProjectDocumentId('legacy-project-route')
</script>

<template>
  <ProjectOverview v-if="projectDocumentId" :id="projectDocumentId" :key="projectDocumentId" />
</template>
