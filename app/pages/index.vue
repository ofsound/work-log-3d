<script setup lang="ts">
import { computed } from 'vue'
import { definePageMeta } from '#imports'
import { useCollection } from 'vuefire'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { buildHomeActivityWeeks } from '~~/shared/worklog'

definePageMeta({ layout: 'main-bleed' })

const { timeBoxesCollection } = useFirestoreCollections()
const { data: allTimeBoxes, pending: timeBoxesPending } = useCollection(timeBoxesCollection)

const isHomeActivityLoading = computed(() => !timeBoxesCollection.value || timeBoxesPending.value)

const resolvedTimeBoxes = computed(() =>
  toTimeBoxes(allTimeBoxes.value as FirebaseTimeBoxDocument[]),
)
const homeActivityWeeks = computed(() =>
  buildHomeActivityWeeks(resolvedTimeBoxes.value, new Date()),
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col items-center justify-center px-4 py-8">
    <HomeActivityTimeline :weeks="homeActivityWeeks" :loading="isHomeActivityLoading" />
  </div>
</template>
