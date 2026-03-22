<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import { getProjectBadgeStyle, getProjectHeaderStyle } from '~/utils/project-color-styles'
import { getProjectEditPath } from '~/utils/worklog-routes'
import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProject, toTimeBoxes } from '~/utils/worklog-firebase'
import {
  getTotalDurationLabel,
  groupTimeBoxesByStartDay,
  sortTimeBoxesByStart,
} from '~~/shared/worklog'

const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const router = useRouter()
const rawProjectSource = computed(() =>
  projectsCollection.value ? doc(projectsCollection.value, props.id) : null,
)
const rawProject = useDocument(rawProjectSource, {
  ssrKey: `project-overview-${props.id}`,
})
const store = useStore()
const projectTimeBoxesQuery = computed(() =>
  timeBoxesCollection.value
    ? query(timeBoxesCollection.value, where('project', '==', props.id))
    : null,
)
const timeBoxes = useCollection(projectTimeBoxesQuery, {
  ssrKey: `project-timeboxes-${props.id}`,
})

const projectTimeBoxes = computed(() =>
  sortTimeBoxesByStart(
    toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]),
    store.sortOrderReversed ? 'desc' : 'asc',
  ),
)

const project = computed(() =>
  rawProject.value ? toProject(rawProject.value as FirebaseProjectDocument) : null,
)
const projectOverviewDayObjects = computed(() => groupTimeBoxesByStartDay(projectTimeBoxes.value))
const projectTimeBoxesTotalDuration = computed(() => getTotalDurationLabel(projectTimeBoxes.value))
const headerStyle = computed(() =>
  project.value ? getProjectHeaderStyle(project.value.colors) : {},
)
const durationBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)

const openProjectEditor = async () => {
  await router.push(getProjectEditPath(props.id))
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="relative z-10 flex min-h-22 w-full items-center justify-center px-6 py-5 shadow-overview"
      :style="headerStyle"
    >
      <button
        type="button"
        class="absolute top-4 right-4 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase hover:bg-white/10"
        @click="openProjectEditor"
      >
        Edit Project
      </button>
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
