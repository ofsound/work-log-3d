<script setup lang="ts">
import { query, where, limit } from 'firebase/firestore'

const { tagsCollection } = useFirestoreCollections()

const route = useRoute()
const slug = computed(() => {
  const p = route.params.slug
  return Array.isArray(p) ? p[0] : (p ?? '')
})

const tagsQuery = computed(() => query(tagsCollection, where('slug', '==', slug.value), limit(1)))
const tagSnap = useCollection(tagsQuery, { ssrKey: 'tag-slug' })

const tag = computed(() => tagSnap.value[0])
</script>

<template>
  <TagOverview v-if="tag" :id="tag.id" :key="tag.id" />
</template>
