<script setup lang="ts">
import { computed } from 'vue'

import { definePageMeta } from '#imports'

import PhoneRouteLoading from '~/components/PhoneRouteLoading.vue'
import ProjectEditorWorkspace from '~/components/ProjectEditorWorkspace.vue'

definePageMeta({ layout: 'main-workspace' })

const { projectDocumentId } = useResolvedProjectDocumentId('legacy-project-edit-route')
const { hasResolvedViewport, isPhoneMode } = usePhoneMode()
const shouldHoldProjectEditorWorkspace = computed(
  () => import.meta.server || !hasResolvedViewport.value,
)
</script>

<template>
  <PhoneRouteLoading v-if="shouldHoldProjectEditorWorkspace" />
  <ProjectEditorWorkspace v-else-if="projectDocumentId && !isPhoneMode" :id="projectDocumentId" />
</template>
