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

const sortedAllProjects = computed<Project[]>(() =>
  sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[])),
)
</script>

<template>
  <div
    class="my-4 w-full rounded-sm border border-border-subtle bg-panel-project px-6 py-4 shadow-panel"
    style="width: 100%; min-width: 100%"
  >
    <div class="mb-8 text-center text-xl font-bold uppercase">Projects</div>
    <div class="flex flex-col gap-4">
      <ProjectsManagerProject v-for="item in sortedAllProjects" :key="item.id" :project="item" />
    </div>
    <div class="mt-8 flex justify-end">
      <button
        class="ml-auto block w-max cursor-pointer rounded-md bg-button-primary px-3 py-1 tracking-wide text-button-primary-text hover:bg-button-primary-hover"
        @click="router.push(getProjectNewPath())"
      >
        + Create Project
      </button>
    </div>
  </div>
</template>
