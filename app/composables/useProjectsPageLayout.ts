import { ref, watch } from 'vue'

import { useCurrentUser } from '#imports'

import {
  DEFAULT_PROJECTS_PAGE_LAYOUT,
  getProjectsLayoutStorageKey,
  readProjectsPageLayout,
  writeProjectsPageLayout,
} from '~/utils/projects-page-layout'
import type { ProjectsPageLayout } from '~/utils/projects-page-layout'

export const useProjectsPageLayout = () => {
  const currentUser = useCurrentUser()
  const layout = ref<ProjectsPageLayout>(DEFAULT_PROJECTS_PAGE_LAYOUT)

  if (import.meta.client) {
    const storage = window.localStorage

    watch(
      () => currentUser.value,
      (user) => {
        if (user === undefined) {
          return
        }

        const key = getProjectsLayoutStorageKey(user?.uid ?? null)
        const stored = readProjectsPageLayout(storage, key)

        layout.value = stored ?? DEFAULT_PROJECTS_PAGE_LAYOUT
      },
      { immediate: true },
    )

    watch(layout, (next) => {
      if (currentUser.value === undefined) {
        return
      }

      const key = getProjectsLayoutStorageKey(currentUser.value?.uid ?? null)

      writeProjectsPageLayout(storage, key, next)
    })
  }

  const setLayout = (next: ProjectsPageLayout) => {
    layout.value = next
  }

  return {
    layout,
    setLayout,
  }
}
