<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { doc, type DocumentData } from 'firebase/firestore'

import { useStore } from '@/stores/store'

import { formatMinutesToHoursAndMinutes } from '@/utils/formatters'

const { db, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const tag = useDocument(doc(db, 'tags', props.id))
const timeBoxes = useCollection(timeBoxesCollection)

const store = useStore()

const tagOverviewDayObjects = ref<DocumentData[][]>([[]])

const sortedTagTimeBoxes = computed(() => {
  const tagTimeBoxes = timeBoxes.value.filter((timeBox) => {
    return timeBox.tags.some((tagID: string) => tagID === props.id)
  })

  return tagTimeBoxes.slice().sort((a, b) => {
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

const tagTimeBoxesTotalDuration = () => {
  let tagTotalDuration = 0

  const tagTimeBoxes = timeBoxes.value.filter((timeBox) => {
    return timeBox.tags.some((tagID: string) => tagID === props.id)
  })

  tagTimeBoxes.forEach((timeBox: DocumentData) => {
    if (timeBox.endTime && timeBox.startTime) {
      const timeBoxDuration =
        (timeBox.endTime.toDate().valueOf() - timeBox.startTime.toDate().valueOf()) / 60000
      tagTotalDuration += timeBoxDuration
    }
  })

  const { hours, minutes } = formatMinutesToHoursAndMinutes(tagTotalDuration)

  if (hours > 0) {
    return hours + minutes
  } else {
    return minutes
  }
}

watch(
  () => sortedTagTimeBoxes.value,
  (newValue) => {
    tagOverviewDayObjects.value[0] = [] as DocumentData[]
    let tagOverviewDayObjectsIndex = -1
    let prevDateString = ''
    newValue.forEach((timeBox) => {
      const timeBoxDateString = timeBox.startTime.toDate().toDateString()

      if (timeBoxDateString !== prevDateString) {
        tagOverviewDayObjectsIndex++
        tagOverviewDayObjects.value[tagOverviewDayObjectsIndex] = []
      }

      prevDateString = timeBoxDateString

      const innerArray = tagOverviewDayObjects.value[tagOverviewDayObjectsIndex]
      innerArray?.push(timeBox)
    })
  },
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="relative z-10 flex h-22 w-full max-w-250 items-center justify-center bg-linear-to-br from-slate-800 to-zinc-900 text-white shadow-sm shadow-gray-700"
    >
      <div class="text-center text-3xl font-bold">{{ tag?.name }}</div>
      <div
        class="relative top-px ml-4 w-max rounded-md bg-emerald-800 px-1.5 py-0.5 pt-px font-data text-sm tracking-wide text-white"
      >
        {{ tagTimeBoxesTotalDuration() }} hrs
      </div>
    </div>
    <div class="flex-1 overflow-auto px-11 pt-8">
      <TagOverviewDay
        v-for="(item, index) in tagOverviewDayObjects"
        :key="index"
        :tag-overview-day-data="item"
      />
    </div>
  </div>
</template>
