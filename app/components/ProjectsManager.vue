<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from '#imports'
import { useCollection } from 'vuefire'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useProjectsPageLayout } from '~/composables/useProjectsPageLayout'
import GridLayoutIcon from '~/icons/GridLayoutIcon.vue'
import ListLayoutIcon from '~/icons/ListLayoutIcon.vue'

import { sortNamedEntities } from '~~/shared/worklog'
import { toProjects } from '~/utils/worklog-firebase'
import { getProjectNewPath } from '~/utils/worklog-routes'

import type { Project } from '~~/shared/worklog'
import type { FirebaseProjectDocument } from '~/utils/worklog-firebase'

const { projectsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const router = useRouter()
const { layout, setLayout } = useProjectsPageLayout()

const allProjectsNormalized = computed<Project[]>(() =>
  sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[])),
)
const activeProjects = computed(() => allProjectsNormalized.value.filter((p) => !p.archived))
const archivedProjects = computed(() => allProjectsNormalized.value.filter((p) => p.archived))
</script>

<template>
  <ContainerCard
    as="section"
    class="mb-4 w-full rounded-sm py-4"
    padding="comfortable"
    style="width: 100%; min-width: 100%"
    variant="projectGradient"
  >
    <div class="mb-8 flex items-center gap-3">
      <div class="min-w-0 flex-1" aria-hidden="true" />
      <div class="shrink-0 text-center text-xl font-bold uppercase">Projects</div>
      <div class="flex min-w-0 flex-1 justify-end">
        <div
          class="inline-flex rounded-md border border-border bg-surface-muted p-0.5 shadow-control"
          role="group"
          aria-label="Project layout"
        >
          <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-strong hover:text-text"
            :class="layout === 'list' ? 'bg-surface text-text shadow-sm' : ''"
            aria-label="List layout"
            title="List layout"
            :aria-pressed="layout === 'list'"
            @click="setLayout('list')"
          >
            <ListLayoutIcon class="size-[18px]" />
          </button>
          <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-strong hover:text-text"
            :class="layout === 'grid' ? 'bg-surface text-text shadow-sm' : ''"
            aria-label="Grid layout"
            title="Grid layout"
            :aria-pressed="layout === 'grid'"
            @click="setLayout('grid')"
          >
            <GridLayoutIcon class="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <div class="text-center text-sm font-semibold tracking-wide text-text-muted uppercase">
          Active
        </div>
        <div
          :class="[
            layout === 'list' ? 'flex flex-col gap-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
          ]"
        >
          <ProjectsManagerProject
            v-for="item in activeProjects"
            :key="item.id"
            :layout="layout"
            :project="item"
          />
        </div>
      </div>
      <div v-if="archivedProjects.length > 0" class="flex flex-col gap-3">
        <div class="text-center text-sm font-semibold tracking-wide text-text-muted uppercase">
          Archived
        </div>
        <div
          :class="[
            layout === 'list' ? 'flex flex-col gap-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
          ]"
        >
          <ProjectsManagerProject
            v-for="item in archivedProjects"
            :key="item.id"
            :layout="layout"
            :project="item"
          />
        </div>
      </div>
    </div>
    <div class="mt-8 flex justify-end">
      <button
        type="button"
        class="ml-auto block w-max cursor-pointer rounded-md bg-button-primary px-3 py-1 tracking-wide text-button-primary-text hover:bg-button-primary-hover"
        aria-label="Create project"
        @click="router.push(getProjectNewPath())"
      >
        + Create Project
      </button>
    </div>
  </ContainerCard>
</template>
