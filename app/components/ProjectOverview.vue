<script setup lang="ts">
import { doc, query, where, orderBy } from 'firebase/firestore'

import { getProjectBadgeStyle, getProjectHeaderStyle } from '~/utils/project-color-styles'
import { getProjectEditPath } from '~/utils/worklog-routes'
import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProject, toTimeBoxes } from '~/utils/worklog-firebase'
import { getTotalDurationLabel, groupTimeBoxesByStartDay } from '~~/shared/worklog'

const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const rawProject = useDocument(doc(projectsCollection, props.id))
const store = useStore()

const projectTimeBoxesQuery = computed(() =>
  query(
    timeBoxesCollection,
    where('project', '==', props.id),
    orderBy('startTime', store.sortOrderReversed ? 'desc' : 'asc'),
  ),
)
const timeBoxes = useCollection(projectTimeBoxesQuery)

const project = computed(() =>
  rawProject.value ? toProject(rawProject.value as FirebaseProjectDocument) : null,
)
const projectTimeBoxes = computed(() => toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]))
const projectOverviewDayObjects = computed(() => groupTimeBoxesByStartDay(projectTimeBoxes.value))
const projectTimeBoxesTotalDuration = computed(() => getTotalDurationLabel(projectTimeBoxes.value))
const headerStyle = computed(() =>
  project.value ? getProjectHeaderStyle(project.value.colors) : {},
)
const durationBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="relative z-10 flex min-h-22 w-full max-w-250 items-center justify-center px-6 py-5 shadow-overview"
      :style="headerStyle"
    >
      <NuxtLink
        :to="getProjectEditPath(id)"
        class="absolute top-4 right-4 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase hover:bg-white/10"
      >
        Edit Project
      </NuxtLink>
      <div class="text-center text-3xl font-bold">{{ project?.name }}</div>
      <div
        class="relative top-px ml-4 w-max rounded-md border px-1.5 py-0.5 pt-px font-data text-sm tracking-wide"
        :style="durationBadgeStyle"
      >
        {{ projectTimeBoxesTotalDuration }} hrs
      </div>
    </div>
    <div class="flex-1 overflow-auto px-11 pt-8">
      <ProjectOverviewDay
        v-for="(item, index) in projectOverviewDayObjects"
        :key="index"
        :project-colors="project?.colors"
        :project-overview-day-data="item"
      />
    </div>
  </div>
</template>
