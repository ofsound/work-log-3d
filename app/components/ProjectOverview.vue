<script setup lang="ts">
import { doc, query, where, orderBy } from 'firebase/firestore'

import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { getTotalDurationLabel, groupTimeBoxesByStartDay } from '~~/shared/worklog'

const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const project = useDocument(doc(projectsCollection, props.id))
const store = useStore()

const projectTimeBoxesQuery = computed(() =>
  query(
    timeBoxesCollection,
    where('project', '==', props.id),
    orderBy('startTime', store.sortOrderReversed ? 'desc' : 'asc'),
  ),
)
const timeBoxes = useCollection(projectTimeBoxesQuery)

const projectTimeBoxes = computed(() => toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]))
const projectOverviewDayObjects = computed(() => groupTimeBoxesByStartDay(projectTimeBoxes.value))
const projectTimeBoxesTotalDuration = computed(() => getTotalDurationLabel(projectTimeBoxes.value))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="relative z-10 flex h-22 w-full max-w-250 items-center justify-center bg-linear-to-br from-slate-800 to-zinc-900 text-white shadow-sm shadow-gray-700"
    >
      <div class="text-center text-3xl font-bold">{{ project?.name }}</div>
      <div
        class="relative top-px ml-4 w-max rounded-md bg-emerald-800 px-1.5 py-0.5 pt-px font-data text-sm tracking-wide text-white"
      >
        {{ projectTimeBoxesTotalDuration }} hrs
      </div>
    </div>
    <div class="flex-1 overflow-auto px-11 pt-8">
      <ProjectOverviewDay
        v-for="(item, index) in projectOverviewDayObjects"
        :key="index"
        :project-overview-day-data="item"
      />
    </div>
  </div>
</template>
