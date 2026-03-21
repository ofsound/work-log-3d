<script setup lang="ts">
import { limit, query, where } from 'firebase/firestore'

import { getTagPath } from '~/utils/worklog-routes'

const { tagsCollection } = useFirestoreCollections()
const route = useRoute()
const requestedTagId = computed(() => {
  const p = route.params.id
  return Array.isArray(p) ? p[0] : (p ?? '')
})

const legacyTagQuery = computed(() =>
  query(tagsCollection, where('slug', '==', requestedTagId.value), limit(1)),
)
const legacyTags = useCollection(legacyTagQuery, { ssrKey: 'legacy-tag-route' })

const tagId = computed(() => legacyTags.value[0]?.id ?? requestedTagId.value)

watchEffect(() => {
  const legacyTag = legacyTags.value[0]

  if (legacyTag?.id && legacyTag.id !== requestedTagId.value) {
    void navigateTo(getTagPath(legacyTag.id), {
      replace: true,
      redirectCode: 301,
    })
  }
})
</script>

<template>
  <TagOverview v-if="tagId" :id="tagId" :key="tagId" />
</template>
