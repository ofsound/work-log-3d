<script setup lang="ts">
import { computed } from 'vue'

import TimeBox from '@/components/TimeBox.vue'
import { useStore } from '@/stores/store'

const { timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const store = useStore()

const sortedTimeBoxes = computed(() => {
  return timeBoxes.value.slice().sort((a, b) => {
    const aValue = a['startTime']
    const bValue = b['startTime']

    if (!store.sortOrderReversed) {
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue)
      }
      return aValue - bValue
    } else {
      if (typeof aValue === 'string') {
        return bValue.localeCompare(aValue)
      }
      return bValue - aValue
    }
  })
})
</script>

<template>
  <div class="h-full overflow-auto px-11 pt-8 pb-4">
    <TimeBox v-for="item in sortedTimeBoxes" :id="item.id" :key="item.id" />
  </div>
</template>
