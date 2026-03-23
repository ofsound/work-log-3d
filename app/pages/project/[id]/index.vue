<script setup lang="ts">
import { limit, query, where } from 'firebase/firestore'

import { getProjectPath } from '~/utils/worklog-routes'

const { projectsCollection } = useFirestoreCollections()
const route = useRoute()

const requestedProjectId = computed(() => {
  const p = route.params.id
  return Array.isArray(p) ? p[0] : (p ?? '')
})

const legacyProjectQuery = computed(() =>
  projectsCollection.value
    ? query(projectsCollection.value, where('slug', '==', requestedProjectId.value), limit(1))
    : null,
)
const legacyProjects = useCollection(legacyProjectQuery, { ssrKey: 'legacy-project-route' })

const projectId = computed(() => legacyProjects.value[0]?.id ?? requestedProjectId.value)

watchEffect(() => {
  const legacyProject = legacyProjects.value[0]

  if (legacyProject?.id && legacyProject.id !== requestedProjectId.value) {
    void navigateTo(
      {
        path: getProjectPath(legacyProject.id),
        query: route.query,
      },
      {
        replace: true,
        redirectCode: 301,
      },
    )
  }
})
</script>

<template>
  <ProjectOverview v-if="projectId" :id="projectId" :key="projectId" />
</template>
