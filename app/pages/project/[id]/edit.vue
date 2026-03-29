<script setup lang="ts">
import { computed } from 'vue'

import { definePageMeta } from '#imports'

import PhoneRouteLoading from '~/components/PhoneRouteLoading.vue'
import ProjectEditorWorkspace from '~/components/ProjectEditorWorkspace.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { usePhoneMode } from '~/composables/usePhoneMode'

definePageMeta({ layout: 'main-workspace' })

const { projectDocumentId } = useResolvedProjectDocumentId('legacy-project-edit-route')
const { hasResolvedViewport, isPhoneMode } = usePhoneMode()
const shouldBlockProjectEditorWorkspace = computed(() => !hasResolvedViewport.value)
const { showPending: shouldHoldProjectEditorWorkspace } = useDelayedPending(
  shouldBlockProjectEditorWorkspace,
)
</script>

<template>
  <PhoneRouteLoading v-if="shouldHoldProjectEditorWorkspace" />
  <ProjectEditorWorkspace
    v-else-if="!shouldBlockProjectEditorWorkspace && projectDocumentId && !isPhoneMode"
    :id="projectDocumentId"
  />
</template>
