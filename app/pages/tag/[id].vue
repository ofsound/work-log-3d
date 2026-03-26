<script setup lang="ts">
import { definePageMeta } from '#imports'
import { doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'

import { getSessionsSearchRouteForTag } from '~/utils/sessions-route-state'

definePageMeta({ layout: 'main-workspace' })

const { hideTags } = useUserSettings()
const { tagsCollection } = useFirestoreCollections()
const route = useRoute()

const requestedSegment = computed(() => {
  const p = route.params.id
  return Array.isArray(p) ? p[0] : (p ?? '')
})

const runRedirect = async () => {
  if (import.meta.server) {
    return
  }

  if (hideTags.value) {
    await navigateTo('/tags', { replace: true })
    return
  }

  const col = tagsCollection.value
  const segment = (requestedSegment.value ?? '').trim()
  if (!col || !segment) {
    await navigateTo('/tags', { replace: true })
    return
  }

  const slugSnap = await getDocs(query(col, where('slug', '==', segment), limit(1)))
  const slugDoc = slugSnap.docs[0]
  const candidateId = slugDoc ? slugDoc.id : segment
  const tagSnap = await getDoc(doc(col, candidateId))

  if (!tagSnap.exists()) {
    await navigateTo('/tags', { replace: true })
    return
  }

  await navigateTo(getSessionsSearchRouteForTag(candidateId), { replace: true })
}

const scheduleRedirect = () => {
  void runRedirect()
}

onMounted(scheduleRedirect)
watch(tagsCollection, scheduleRedirect)
watch(hideTags, scheduleRedirect)
watch(requestedSegment, scheduleRedirect)
</script>

<template>
  <div class="sr-only" aria-live="polite">Redirecting…</div>
</template>
