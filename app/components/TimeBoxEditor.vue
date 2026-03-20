<script setup lang="ts">
import { doc } from 'firebase/firestore'

import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import type { TimeBoxInput } from '~~/shared/worklog'
import { sortNamedEntities } from '~~/shared/worklog'

const props = defineProps({
  id: { type: String, default: undefined },
  startTimeFromTimer: { type: String, default: undefined },
  endTimeFromTimer: { type: String, default: undefined },
})

const emit = defineEmits(['toggleEditor'])

const repositories = useWorklogRepository()
const shell = useHostShell()
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const timeBoxEditorRef = ref<HTMLElement | null>(null)

const dynamicDurationTypingTimer = ref<ReturnType<typeof setTimeout>>()

const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const sortedAllProjects = computed(() => {
  return sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[]))
})

const sortedAllTags = computed(() => {
  return sortNamedEntities(toTags(allTags.value as FirebaseTagDocument[]))
})

const dynamicStartTime = ref('')
const dynamicEndTime = ref('')
const dynamicNotes = ref('')
const dynamicProject = ref('')
const dynamicTags = ref<string[]>([])

const dynamicDuration = ref<string | number>('')

if (props.id) {
  const docBinding = useDocument(doc(timeBoxesCollection, props.id))

  docBinding.promise.value
    .then(() => {
      if (docBinding.data.value) {
        const timeBox = toTimeBox(docBinding.data.value as FirebaseTimeBoxDocument)
        dynamicNotes.value = timeBox.notes
        dynamicStartTime.value = timeBox.startTime ? formatToDatetimeLocal(timeBox.startTime) : ''
        dynamicEndTime.value = timeBox.endTime ? formatToDatetimeLocal(timeBox.endTime) : ''
        dynamicProject.value = timeBox.project
        dynamicTags.value = timeBox.tags
      }
    })
    .catch((error) => {
      console.error('Error loading document:', error)
    })
}

const updateTimeBoxDocument = async () => {
  if (!props.id) return

  const confirmed = shell.confirm(`Are you sure you want to update this Time Box?`)

  if (confirmed) {
    try {
      await repositories.timeBoxes.update(props.id, getTimeBoxInput())
      emit('toggleEditor')
    } catch (e) {
      console.error('Error updating document: ', e)
    }
  } else {
    emit('toggleEditor')
  }
}

const createTimeBoxDocument = async () => {
  if (
    dynamicStartTime.value &&
    dynamicEndTime.value &&
    dynamicNotes.value &&
    dynamicProject.value &&
    dynamicTags.value.length > 0
  ) {
    try {
      await repositories.timeBoxes.create(getTimeBoxInput())
      timeBoxEditorRef.value!.classList.add('animate-[var(--animate-blink-once)]')
      setTimeout(resetTimeBoxEditor, 100)
    } catch (e) {
      console.error('Error adding document: ', e)
    }
  } else {
    console.error("A field in the TimeBox isn't filled out.")
  }
}

const getTimeBoxInput = (): TimeBoxInput => ({
  startTime: new Date(dynamicStartTime.value),
  endTime: new Date(dynamicEndTime.value),
  notes: dynamicNotes.value,
  project: dynamicProject.value,
  tags: dynamicTags.value,
})

const resetTimeBoxEditor = () => {
  dynamicStartTime.value = ''
  dynamicEndTime.value = ''
  dynamicDuration.value = ''
  dynamicProject.value = ''
  dynamicNotes.value = ''
  dynamicTags.value = []
  timeBoxEditorRef.value!.classList.remove('animate-[var(--animate-blink-once)]')
}

const timeBoxDuration = () => {
  const date1 = new Date(dynamicStartTime.value)
  const date2 = new Date(dynamicEndTime.value)

  const differenceInMilliseconds = date2.getTime() - date1.getTime()
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60)

  return differenceInMinutes
}

watch(
  () => props.startTimeFromTimer,
  (newValue) => {
    if (newValue) {
      dynamicStartTime.value = newValue
    } else {
      dynamicStartTime.value = ''
    }
  },
)

watch(
  () => props.endTimeFromTimer,
  (newValue) => {
    if (newValue) {
      dynamicEndTime.value = newValue
    } else {
      dynamicEndTime.value = ''
    }
  },
)

watch(
  () => [dynamicStartTime.value, dynamicEndTime.value],
  () => {
    if (dynamicStartTime.value && dynamicEndTime.value) {
      dynamicDuration.value = timeBoxDuration()
    }
  },
)

watch(
  () => dynamicDuration.value,
  () => {
    if (dynamicStartTime.value) {
      const tempDate = new Date(dynamicStartTime.value)
      tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
      dynamicEndTime.value = formatToDatetimeLocal(tempDate)
    } else {
      clearTimeout(dynamicDurationTypingTimer.value)
      dynamicDurationTypingTimer.value = setTimeout(() => {
        const now = new Date()
        const tempDate = new Date(
          now.setMinutes(now.getMinutes() - parseInt(String(dynamicDuration.value || 0))),
        )
        dynamicStartTime.value = formatToDatetimeLocal(tempDate)
        tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
        dynamicEndTime.value = formatToDatetimeLocal(tempDate)
      }, 400)
    }
  },
)

const handleEscape = (event: { key: string }) => {
  if (event.key === 'Escape') {
    emit('toggleEditor')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div
    ref="timeBoxEditorRef"
    class="my-4 rounded-sm border border-gray-400/20 bg-amber-100 px-6 py-4 font-data shadow-md grayscale-10 *:my-2"
  >
    <div class="flex gap-15">
      <input
        v-model="dynamicDuration"
        class="relative h-max w-21.5 rounded-sm border border-gray-400 bg-white px-2.5 py-1 text-right font-data text-4xl font-bold tabular-nums"
      />
      <div class="flex flex-col gap-1">
        <div class="flex">
          <div class="w-18 font-bold">Start:</div>
          <input v-model="dynamicStartTime" type="datetime-local" class="font-data" />
        </div>
        <div class="flex">
          <div class="w-18 font-bold">End:</div>
          <input v-model="dynamicEndTime" type="datetime-local" />
        </div>
      </div>
    </div>
    <div class="flex py-4">
      <textarea
        v-model="dynamicNotes"
        class="w-full rounded-sm border border-gray-400 bg-white p-2"
        rows="5"
        placeholder="Enter notes here..."
      ></textarea>
    </div>
    <div class="flex border-b border-gray-200 py-4">
      <div class="w-18 font-bold">Project:</div>
      <div class="project-radio-group">
        <label
          v-for="thisProject in sortedAllProjects"
          :key="thisProject.id"
          class="mb-1 block cursor-pointer select-none"
        >
          <input
            v-model="dynamicProject"
            type="radio"
            :value="thisProject.id"
            name="projectSelection"
            class="mr-1.5"
          />
          {{ thisProject.name }}
        </label>
      </div>
    </div>
    <div class="flex py-4 pb-1">
      <div class="w-18 font-bold">Tags:</div>
      <div class="flex gap-4">
        <label
          v-for="thisTag in sortedAllTags"
          :key="thisTag.id"
          class="flex cursor-pointer gap-2 select-none"
        >
          <input v-model="dynamicTags" type="checkbox" :value="thisTag.id" />
          {{ thisTag.name }}
        </label>
      </div>
    </div>
    <div v-if="props.id" class="mt-6! flex gap-3">
      <button
        class="ml-auto block cursor-pointer rounded-md bg-slate-600 px-3 py-1 text-white"
        @click="emit('toggleEditor')"
      >
        Cancel
      </button>
      <button
        class="block cursor-pointer rounded-md bg-slate-600 px-3 py-1 text-white"
        @click="updateTimeBoxDocument"
      >
        Update
      </button>
    </div>
  </div>
  <button
    v-if="!props.id"
    class="w-full cursor-pointer rounded-sm bg-slate-600 p-3 font-bold tracking-wider text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(20,20,20,0.1),0_3px_4px_rgba(80,80,80,0.37)] hover:brightness-120"
    @click="createTimeBoxDocument"
  >
    Log Session
  </button>
</template>
