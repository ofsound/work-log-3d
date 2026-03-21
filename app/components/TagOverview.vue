<script setup lang="ts">
import { doc, query, where, orderBy } from 'firebase/firestore'

import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getTotalDurationLabel, groupTimeBoxesByStartDay } from '~~/shared/worklog'

const { tagsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const tag = useDocument(doc(tagsCollection, props.id))
const store = useStore()

const tagTimeBoxesQuery = computed(() =>
  query(
    timeBoxesCollection,
    where('tags', 'array-contains', props.id),
    orderBy('startTime', store.sortOrderReversed ? 'desc' : 'asc'),
  ),
)
const timeBoxes = useCollection(tagTimeBoxesQuery)

const tagTimeBoxes = computed(() => toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]))
const tagOverviewDayObjects = computed(() => groupTimeBoxesByStartDay(tagTimeBoxes.value))
const tagTimeBoxesTotalDuration = computed(() => getTotalDurationLabel(tagTimeBoxes.value))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="relative z-10 flex h-22 w-full max-w-250 items-center justify-center bg-linear-to-br from-overview-start to-overview-end text-header-text shadow-overview"
    >
      <div class="text-center text-3xl font-bold">{{ tag?.name }}</div>
      <div
        class="relative top-px ml-4 w-max rounded-md bg-badge-duration px-1.5 py-0.5 pt-px font-data text-sm tracking-wide text-badge-duration-text"
      >
        {{ tagTimeBoxesTotalDuration }} hrs
      </div>
    </div>
    <div class="flex-1 overflow-auto px-11 pt-8">
      <TagOverviewDay
        v-for="(item, index) in tagOverviewDayObjects"
        :key="index"
        :tag-overview-day-data="item"
      />
    </div>
  </div>
</template>
