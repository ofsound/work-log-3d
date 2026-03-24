<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from '#imports'
import { useCollection } from 'vuefire'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import type { Project } from '~~/shared/worklog'
import type { FirebaseProjectDocument } from '~/utils/worklog-firebase'
import { toProjects } from '~/utils/worklog-firebase'
import { getProjectNewPath } from '~/utils/worklog-routes'
import { sortNamedEntities } from '~~/shared/worklog'

const { projectsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const router = useRouter()

const allProjectsNormalized = computed<Project[]>(() =>
  sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[])),
)
const activeProjects = computed(() => allProjectsNormalized.value.filter((p) => !p.archived))
const archivedProjects = computed(() => allProjectsNormalized.value.filter((p) => p.archived))
</script>

<template>
  <ContainerCard
    as="section"
    class="my-4 w-full rounded-sm py-4"
    padding="comfortable"
    style="width: 100%; min-width: 100%"
    variant="project"
  >
    <div class="mb-8 text-center text-xl font-bold uppercase">Projects</div>
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <div class="text-center text-sm font-semibold tracking-wide text-text-muted uppercase">
          Active
        </div>
        <div class="flex flex-col gap-4">
          <ProjectsManagerProject v-for="item in activeProjects" :key="item.id" :project="item" />
        </div>
      </div>
      <div v-if="archivedProjects.length > 0" class="flex flex-col gap-3">
        <div class="text-center text-sm font-semibold tracking-wide text-text-muted uppercase">
          Archived
        </div>
        <div class="flex flex-col gap-4">
          <ProjectsManagerProject v-for="item in archivedProjects" :key="item.id" :project="item" />
        </div>
      </div>
    </div>
    <div class="mt-8 flex justify-end">
      <button
        class="ml-auto block w-max cursor-pointer rounded-md bg-button-primary px-3 py-1 tracking-wide text-button-primary-text hover:bg-button-primary-hover"
        @click="router.push(getProjectNewPath())"
      >
        + Create Project
      </button>
    </div>
  </ContainerCard>
</template>
