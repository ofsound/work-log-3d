<script setup lang="ts">
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import { sortTimeBoxesByStart } from '~~/shared/worklog'

const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const store = useStore()

const sortedTimeBoxes = computed(() => {
  return sortTimeBoxesByStart(
    toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]),
    store.sortOrderReversed ? 'desc' : 'asc',
  )
})
</script>

<template>
  <div class="h-full overflow-auto px-11 pt-8 pb-4">
    <TimeBox v-for="item in sortedTimeBoxes" :id="item.id" :key="item.id" />
  </div>
</template>
