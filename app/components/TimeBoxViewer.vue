<script setup lang="ts">
import { doc } from 'firebase/firestore'

import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import { findProjectName, findTagNames, getDurationMinutesLabel } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const shell = useHostShell()
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
  variant: { type: String, default: undefined },
  isMinimized: { type: Boolean, default: false },
})

const emit = defineEmits(['toggleEditor'])

const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const rawTimeBox = useDocument(doc(timeBoxesCollection, props.id))
const timeBox = computed(() => {
  if (!rawTimeBox.value) {
    return null
  }

  return toTimeBox(rawTimeBox.value as FirebaseTimeBoxDocument)
})

const projectName = computed(() => {
  return findProjectName(
    toProjects(allProjects.value as FirebaseProjectDocument[]),
    timeBox.value?.project ?? '',
  )
})

const tagNames = computed(() => {
  return findTagNames(toTags(allTags.value as FirebaseTagDocument[]), timeBox.value?.tags ?? [])
})

const timeBoxDuration = computed(() =>
  timeBox.value ? getDurationMinutesLabel(timeBox.value) : '0m',
)

const startDayFormatted = computed(() => {
  return timeBox.value?.startTime?.toLocaleDateString([], {
    weekday: 'short',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
})

const startTimeFormatted = computed(() => {
  return timeBox.value?.startTime?.toLocaleTimeString([], {
    hourCycle: 'h12',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const endTimeFormatted = computed(() => {
  return timeBox.value?.endTime?.toLocaleTimeString([], {
    hourCycle: 'h12',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const deleteTimeBoxDocument = async () => {
  const confirmed = shell.confirm(`Are you sure you want to delete this Session?`)

  if (confirmed) {
    try {
      await repositories.timeBoxes.remove(props.id)
    } catch (e) {
      console.error('Error deleting document: ', e)
    }
  }
}
</script>

<template>
  <div
    v-if="!isMinimized"
    class="relative my-4 rounded-sm border border-gray-400/20 bg-slate-100 px-6 py-4 shadow-md"
  >
    <button class="absolute right-4 bottom-3 cursor-pointer px-1" @click="emit('toggleEditor')">
      <EditIcon />
    </button>
    <button class="absolute right-4 cursor-pointer px-1" @click="deleteTimeBoxDocument">
      <DeleteIcon />
    </button>
    <div class="flex items-baseline gap-2 border-b pb-2">
      <div class="w-max rounded-sm text-2xl font-bold">
        {{ timeBoxDuration }}
      </div>
      <div v-if="variant !== 'project'" class="flex items-baseline gap-2">
        <div class="relative -top-0.5 font-bold">–</div>
        <div class="relative -top-px text-xl font-bold">{{ projectName }}</div>
      </div>
    </div>
    <div class="mt-3 font-data">{{ startDayFormatted }}</div>
    <div class="mt-px font-data text-sm italic">
      {{ startTimeFormatted }} &mdash; {{ endTimeFormatted }}
    </div>
    <div class="my-5 font-data">{{ timeBox?.notes }}</div>
    <div class="flex gap-2">
      <div
        v-for="thisTag in tagNames"
        :key="thisTag"
        class="rounded-xl bg-gray-300 px-3 py-0.5 font-data text-sm"
      >
        <div class="relative -top-px">{{ thisTag }}</div>
      </div>
    </div>
  </div>
  <div
    v-if="isMinimized"
    class="mb-2.5 items-baseline gap-2 border-b border-gray-200 last:border-0"
  >
    <div v-if="variant !== 'project'" class="font-bold">{{ projectName }}</div>
    <div class="pb-2 font-data">
      {{ timeBox?.notes }}
      <span class="ml-2 text-xs font-bold italic"
        ><span class="text-gray-400">[</span> {{ timeBoxDuration }}
        <span class="text-gray-400">]</span></span
      >
    </div>
  </div>
</template>
