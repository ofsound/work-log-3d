<script setup lang="ts">
import { limit, query, where } from 'firebase/firestore'

import { getTagPath } from '~/utils/worklog-routes'

const { hideTags } = useUserSettings()
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
  <div
    v-if="hideTags"
    class="mx-auto mt-8 max-w-3xl rounded-2xl border border-border-subtle bg-surface px-6 py-6 shadow-panel"
  >
    <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Tags hidden</div>
    <div class="mt-2 text-2xl font-bold text-text">Project-first mode is active</div>
    <p class="mt-3 text-sm leading-6 text-text-muted">
      Existing tag data is still stored, but tag detail pages are hidden while tags are disabled in
      your workflow settings.
    </p>
  </div>
  <TagOverview v-else-if="tagId" :id="tagId" :key="tagId" />
</template>
