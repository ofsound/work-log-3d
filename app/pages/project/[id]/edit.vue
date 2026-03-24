<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-workspace' })

const { projectDocumentId } = useResolvedProjectDocumentId('legacy-project-edit-route')
</script>

<template>
  <ProjectEditorWorkspace v-if="projectDocumentId" :id="projectDocumentId" />
</template>
