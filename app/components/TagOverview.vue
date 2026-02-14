<script setup lang="ts">
import { doc, query, where, orderBy, type DocumentData } from 'firebase/firestore'

const { tagsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const tag = useDocument(doc(tagsCollection, props.id))
const store = useStore()

const tagTimeBoxesQuery = computed(() =>
  query(
    timeBoxesCollection,
    where('tags', 'array-contains', props.id),
    orderBy('startTime', store.sortOrderReversed ? 'desc' : 'asc'),
  ),
)
const timeBoxes = useCollection(tagTimeBoxesQuery)

const tagOverviewDayObjects = ref<DocumentData[][]>([[]])

const tagTimeBoxesTotalDuration = computed(() => {
  let tagTotalDuration = 0
  timeBoxes.value.forEach((timeBox: DocumentData) => {
    if (timeBox.endTime && timeBox.startTime) {
      const timeBoxDuration =
        (timeBox.endTime.toDate().valueOf() - timeBox.startTime.toDate().valueOf()) / 60000
      tagTotalDuration += timeBoxDuration
    }
  })
  const { hours, minutes } = formatMinutesToHoursAndMinutes(tagTotalDuration)
  return hours > 0 ? hours + minutes : minutes
})

watch(
  () => timeBoxes.value,
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
        {{ tagTimeBoxesTotalDuration }} hrs
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
