<script setup lang="ts">
import { parseNewTimeBoxRoutePrefill } from '~/utils/new-timebox-route-state'
import { toProjects, toTags } from '~/utils/worklog-firebase'
import { sortNamedEntities } from '~~/shared/worklog'

import type { FirebaseProjectDocument, FirebaseTagDocument } from '~/utils/worklog-firebase'

const route = useRoute()
const { snapshot, cancel } = useTimerService()
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
  const endAtMs =
    snapshot.value.mode === 'countup' && snapshot.value.pausedAtMs !== null
      ? snapshot.value.pausedAtMs
      : snapshot.value.endedAtMs

  if (endAtMs === null) {
    return ''
  }

  return formatToDatetimeLocal(new Date(endAtMs))
})

const adderRootRef = ref<HTMLElement | null>(null)

const scrollAdderToTopAfterSave = () => {
  nextTick(() => {
    adderRootRef.value?.scrollIntoView({ behavior: 'auto', block: 'start' })
  })
}

const handleSave = async () => {
  const shouldResetTimer =
    (snapshot.value.mode === 'countup' && snapshot.value.status === 'paused') ||
    (snapshot.value.mode === 'countdown' && snapshot.value.status === 'completed')

  if (shouldResetTimer) {
    await cancel()
  }

  scrollAdderToTopAfterSave()
}
</script>

<template>
  <div ref="adderRootRef" class="flex flex-col gap-6">
    <div class="grid gap-4 lg:grid-cols-2">
      <CountdownTimer
        :class="{ 'pointer-events-none blur-[2px] grayscale-100': countUpIsActive }"
        :inert="countUpIsActive"
      />
      <CountupTimer
        :class="{ 'pointer-events-none blur-[2px] grayscale-100': countDownIsActive }"
        :inert="countDownIsActive"
      />
    </div>

    <TimeBoxEditor
      :start-time-from-timer="startTimeFromTimer"
      :end-time-from-timer="endTimeFromTimer"
      :initial-project="routePrefill.project"
      :initial-tags="routePrefill.tags"
      @saved="handleSave"
    />
  </div>
</template>
