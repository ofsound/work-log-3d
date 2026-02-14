<script setup lang="ts">
import { collection, query, where, limit } from 'firebase/firestore'

const { db } = useFirestoreCollections()

const route = useRoute()
const slug = computed(() => {
  const p = route.params.slug
  return Array.isArray(p) ? p[0] : (p ?? '')
})

const projectsQuery = computed(() =>
  query(collection(db, 'projects'), where('slug', '==', slug.value), limit(1)),
)
const projectSnap = useCollection(projectsQuery, { ssrKey: 'project-slug' })

const project = computed(() => projectSnap.value[0])
</script>

<template>
  <ProjectOverview v-if="project" :id="project.id" :key="project.id" />
</template>
