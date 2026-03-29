<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useCollection } from 'vuefire'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useMediaQuery } from '~/composables/useMediaQuery'
import GridLayoutIcon from '~/icons/GridLayoutIcon.vue'
import ListLayoutIcon from '~/icons/ListLayoutIcon.vue'

import { sortNamedEntities } from '~~/shared/worklog'
import { toProjects } from '~/utils/worklog-firebase'
import { getProjectNewPath } from '~/utils/worklog-routes'

import { coerceProjectsPageViewQuery, type ProjectsPageLayout } from '~/utils/projects-page-layout'
import type { Project } from '~~/shared/worklog'
import type { FirebaseProjectDocument } from '~/utils/worklog-firebase'

const { projectsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const route = useRoute()
const router = useRouter()
const isBelowSmViewport = useMediaQuery('(max-width: 639px)', false)

/** Grid is the default; `?view=list` opts into list. Omit `view` for grid. */
const projectsLayout = computed<ProjectsPageLayout>(() =>
  coerceProjectsPageViewQuery(route.query.view),
)
const effectiveLayout = computed<ProjectsPageLayout>(() =>
  isBelowSmViewport.value ? 'list' : projectsLayout.value,
)

const setLayout = (next: ProjectsPageLayout) => {
  const query = { ...route.query }
  if (next === 'grid') {
    delete query.view
  } else {
    query.view = 'list'
  }
  router.replace({ query })
}

watch(
  [isBelowSmViewport, projectsLayout],
  ([isBelowSm, layout]) => {
    if (isBelowSm && layout !== 'list') {
      setLayout('list')
    }
  },
  { immediate: true },
)

const allProjectsNormalized = computed<Project[]>(() =>
  sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[])),
)
const activeProjects = computed(() => allProjectsNormalized.value.filter((p) => !p.archived))
const archivedProjects = computed(() => allProjectsNormalized.value.filter((p) => p.archived))
</script>

<template>
  <ContainerCard
    as="section"
    class="mb-4 w-full min-w-0 rounded-sm py-4"
    padding="comfortable"
    style="width: 100%; min-width: 100%"
    variant="projectGradient"
  >
    <div class="mb-8 flex items-center justify-between gap-3">
      <div v-if="!isBelowSmViewport" class="flex min-w-0 flex-1 justify-start">
        <AppButton
          data-testid="projects-new-project-top"
          class="w-max tracking-wide"
          size="sm"
          variant="primary"
          aria-label="New project"
          @click="router.push(getProjectNewPath())"
        >
          New Project
        </AppButton>
      </div>
      <div class="shrink-0 text-2xl font-bold">Projects</div>
      <div v-if="!isBelowSmViewport" class="flex min-w-0 flex-1 justify-end">
        <div
          data-testid="projects-layout-toggle"
          class="inline-flex rounded-md border border-border bg-surface-muted p-0.5 shadow-control"
          role="group"
          aria-label="Project layout"
        >
          <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-strong hover:text-text"
            :class="effectiveLayout === 'list' ? 'bg-surface text-text shadow-sm' : ''"
            aria-label="List layout"
            title="List layout"
            :aria-pressed="effectiveLayout === 'list'"
            @click="setLayout('list')"
          >
            <ListLayoutIcon class="size-[18px]" />
          </button>
          <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-strong hover:text-text"
            :class="effectiveLayout === 'grid' ? 'bg-surface text-text shadow-sm' : ''"
            aria-label="Grid layout"
            title="Grid layout"
            :aria-pressed="effectiveLayout === 'grid'"
            @click="setLayout('grid')"
          >
            <GridLayoutIcon class="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
    <div class="flex min-w-0 flex-col gap-6">
      <div class="flex min-w-0 flex-col gap-3">
        <div
          v-if="archivedProjects.length > 0"
          class="text-center text-sm font-semibold tracking-wide text-text-muted uppercase"
        >
          Active
        </div>
        <div
          :key="effectiveLayout === 'grid' ? 'active-grid' : 'active-list'"
          :class="
            effectiveLayout === 'list'
              ? 'flex flex-col gap-4'
              : 'grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
          "
        >
          <ProjectsManagerProject
            v-for="item in activeProjects"
            :key="item.id"
            :view-mode="effectiveLayout"
            :project="item"
          />
        </div>
      </div>
      <div v-if="archivedProjects.length > 0" class="flex min-w-0 flex-col gap-3">
        <div class="text-center text-sm font-semibold tracking-wide text-text-muted uppercase">
          Archived
        </div>
        <div
          :key="effectiveLayout === 'grid' ? 'archived-grid' : 'archived-list'"
          :class="
            effectiveLayout === 'list'
              ? 'flex flex-col gap-4'
              : 'grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
          "
        >
          <ProjectsManagerProject
            v-for="item in archivedProjects"
            :key="item.id"
            :view-mode="effectiveLayout"
            :project="item"
          />
        </div>
      </div>

      <AppButton
        v-if="isBelowSmViewport"
        data-testid="projects-new-project-bottom"
        class="w-full shrink-0"
        size="sm"
        variant="primary"
        aria-label="New project"
        @click="router.push(getProjectNewPath())"
      >
        New Project
      </AppButton>
    </div>
  </ContainerCard>
</template>
