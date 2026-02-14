<script setup lang="ts">
import { doc, query, where, orderBy, type DocumentData } from 'firebase/firestore'

const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const project = useDocument(doc(projectsCollection, props.id))
const store = useStore()

const projectTimeBoxesQuery = computed(() =>
  query(
    timeBoxesCollection,
    where('project', '==', props.id),
    orderBy('startTime', store.sortOrderReversed ? 'desc' : 'asc'),
  ),
)
const timeBoxes = useCollection(projectTimeBoxesQuery)

const projectOverviewDayObjects = ref<DocumentData[][]>([[]])

const projectTimeBoxesTotalDuration = computed(() => {
  let projectTotalDuration = 0
  timeBoxes.value.forEach((timeBox: DocumentData) => {
    if (timeBox.endTime && timeBox.startTime) {
      const timeBoxDuration =
        (timeBox.endTime.toDate().valueOf() - timeBox.startTime.toDate().valueOf()) / 60000
      projectTotalDuration += timeBoxDuration
    }
  })
  const { hours, minutes } = formatMinutesToHoursAndMinutes(projectTotalDuration)
  return hours > 0 ? hours + minutes : minutes
})

watch(
  () => timeBoxes.value,
  (newValue) => {
    projectOverviewDayObjects.value[0] = [] as DocumentData[]
    let projectOverviewDayObjectsIndex = -1
    let prevDateString = ''
    newValue.forEach((timeBox) => {
      const timeBoxDateString = timeBox.startTime.toDate().toDateString()

      if (timeBoxDateString !== prevDateString) {
        projectOverviewDayObjectsIndex++
        projectOverviewDayObjects.value[projectOverviewDayObjectsIndex] = []
      }

      prevDateString = timeBoxDateString

      const innerArray = projectOverviewDayObjects.value[projectOverviewDayObjectsIndex]
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
      <div class="text-center text-3xl font-bold">{{ project?.name }}</div>
      <div
        class="relative top-px ml-4 w-max rounded-md bg-emerald-800 px-1.5 py-0.5 pt-px font-data text-sm tracking-wide text-white"
      >
        {{ projectTimeBoxesTotalDuration }} hrs
      </div>
    </div>
    <div class="flex-1 overflow-auto px-11 pt-8">
      <ProjectOverviewDay
        v-for="(item, index) in projectOverviewDayObjects"
        :key="index"
        :project-overview-day-data="item"
      />
    </div>
  </div>
</template>
