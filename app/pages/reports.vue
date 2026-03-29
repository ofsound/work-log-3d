<script setup lang="ts">
import { computed } from 'vue'

import { definePageMeta } from '#imports'

import PhoneRouteLoading from '~/components/PhoneRouteLoading.vue'
import ReportsWorkspace from '~/components/ReportsWorkspace.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { usePhoneMode } from '~/composables/usePhoneMode'

definePageMeta({ layout: 'main-workspace' })

const { hasResolvedViewport, isPhoneMode } = usePhoneMode()
const shouldBlockReportsWorkspace = computed(() => !hasResolvedViewport.value)
const { showPending: shouldHoldReportsWorkspace } = useDelayedPending(shouldBlockReportsWorkspace)
</script>

<template>
  <PhoneRouteLoading v-if="shouldHoldReportsWorkspace" />
  <ReportsWorkspace v-else-if="!shouldBlockReportsWorkspace && !isPhoneMode" />
</template>
