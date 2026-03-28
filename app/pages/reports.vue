<script setup lang="ts">
import { computed } from 'vue'

import { definePageMeta } from '#imports'

import PhoneRouteLoading from '~/components/PhoneRouteLoading.vue'
import ReportsWorkspace from '~/components/ReportsWorkspace.vue'

definePageMeta({ layout: 'main-workspace' })

const { hasResolvedViewport, isPhoneMode } = usePhoneMode()
const shouldHoldReportsWorkspace = computed(() => !hasResolvedViewport.value)
</script>

<template>
  <PhoneRouteLoading v-if="shouldHoldReportsWorkspace" />
  <ReportsWorkspace v-else-if="!isPhoneMode" />
</template>
