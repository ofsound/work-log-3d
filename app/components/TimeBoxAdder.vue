<script setup lang="ts">
import { parseNewTimeBoxRoutePrefill } from '~/utils/new-timebox-route-state'
import { toProjects, toTags } from '~/utils/worklog-firebase'
import { sortNamedEntities } from '~~/shared/worklog'

import type { FirebaseProjectDocument, FirebaseTagDocument } from '~/utils/worklog-firebase'

const route = useRoute()
const { snapshot } = useTimerService()
const { projectsCollection, tagsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const countUpIsActive = computed(() => snapshot.value.mode === 'countup' && snapshot.value.isActive)
const countDownIsActive = computed(
  () => snapshot.value.mode === 'countdown' && snapshot.value.isActive,
)

const sortedProjects = computed(() =>
  sortNamedEntities(toProjects((allProjects.value as FirebaseProjectDocument[] | undefined) ?? [])),
)
const nonArchivedProjectIds = computed(() =>
  sortedProjects.value.filter((p) => !p.archived).map((p) => p.id),
)

const sortedTags = computed(() =>
  sortNamedEntities(toTags((allTags.value as FirebaseTagDocument[] | undefined) ?? [])),
)

const routePrefill = computed(() =>
  parseNewTimeBoxRoutePrefill(route.query as Record<string, string | string[] | undefined>, {
    validProjectIds: nonArchivedProjectIds.value,
    validTagIds: sortedTags.value.map((tag) => tag.id),
  }),
)

const startTimeFromTimer = computed(() => {
  if (snapshot.value.startedAtMs === null) {
    return ''
  }

  return formatToDatetimeLocal(new Date(snapshot.value.startedAtMs))
})

const endTimeFromTimer = computed(() => {
  if (snapshot.value.endedAtMs === null) {
    return ''
  }

  return formatToDatetimeLocal(new Date(snapshot.value.endedAtMs))
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-4 lg:grid-cols-2">
      <CountdownTimer :class="{ 'blur-[2px] grayscale-100': countUpIsActive }" />
      <CountupTimer :class="{ 'blur-[2px] grayscale-100': countDownIsActive }" />
    </div>

    <TimeBoxEditor
      :start-time-from-timer="startTimeFromTimer"
      :end-time-from-timer="endTimeFromTimer"
      :initial-project="routePrefill.project"
      :initial-tags="routePrefill.tags"
    />
  </div>
</template>
