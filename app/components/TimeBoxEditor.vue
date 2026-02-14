<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { doc, updateDoc, addDoc, Timestamp, type DocumentReference } from 'firebase/firestore'

import { formatToDatetimeLocal } from '@/utils/formatters'

const props = defineProps({
  id: { type: String, default: undefined },
  startTimeFromTimer: { type: String, default: undefined },
  endTimeFromTimer: { type: String, default: undefined },
})

const emit = defineEmits(['toggleEditor'])

const { db, timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const timeBoxEditorRef = ref<HTMLElement | null>(null)

const dynamicDurationTypingTimer = ref<NodeJS.Timeout>()

const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const sortedAllProjects = computed(() => {
  return allProjects.value.slice().sort((a, b) => {
    const aValue = a['name']
    const bValue = b['name']

    if (typeof aValue === 'string') {
      return aValue.localeCompare(bValue)
    }
    return aValue - bValue
  })
})

const sortedAllTags = computed(() => {
  return allTags.value.slice().sort((a, b) => {
    const aValue = a['name']
    const bValue = b['name']

    if (typeof aValue === 'string') {
      return aValue.localeCompare(bValue)
    }
    return aValue - bValue
  })
})

const dynamicStartTime = ref('')
const dynamicEndTime = ref('')
const dynamicNotes = ref('')
const dynamicProject = ref('')
const dynamicTags = ref([])

const dynamicDuration = ref()

let timeBoxRef: DocumentReference

if (props.id) {
  timeBoxRef = doc(db, 'timeBoxes', props.id)
  const docBinding = useDocument(timeBoxRef)

  const timeBox = docBinding.data

  docBinding.promise.value
    .then(() => {
      if (timeBox.value) {
        dynamicNotes.value = timeBox.value.notes
        dynamicStartTime.value = formatToDatetimeLocal(timeBox.value.startTime.toDate())
        dynamicEndTime.value = formatToDatetimeLocal(timeBox.value.endTime.toDate())
        dynamicProject.value = timeBox.value.project
        dynamicTags.value = timeBox.value.tags
      }
    })
    .catch((error) => {
      console.error('Error loading document:', error)
    })
}

const updateTimeBoxDocument = async () => {
  const confirmed = window.confirm(`Are you sure you want to update this Time Box?`)

  if (confirmed) {
    try {
      await updateDoc(timeBoxRef, {
        startTime: Timestamp.fromDate(new Date(dynamicStartTime.value)),
        endTime: Timestamp.fromDate(new Date(dynamicEndTime.value)),
        notes: dynamicNotes.value,
        project: dynamicProject.value,
        tags: dynamicTags.value,
      })
      emit('toggleEditor')
      console.log('Document updated with ID: ', timeBoxRef.id)
    } catch (e) {
      console.error('Error updating document: ', e)
    }
  } else {
    emit('toggleEditor')
    console.log('Update cancelled.')
  }
}

const createTimeBoxDocument = async () => {
  if (
    dynamicStartTime.value &&
    dynamicEndTime.value &&
    dynamicNotes.value &&
    dynamicProject.value &&
    dynamicTags.value
  ) {
    try {
      const docRef = await addDoc(timeBoxesCollection, {
        startTime: Timestamp.fromDate(new Date(dynamicStartTime.value)),
        endTime: Timestamp.fromDate(new Date(dynamicEndTime.value)),
        notes: dynamicNotes.value,
        project: dynamicProject.value,
        tags: dynamicTags.value,
      })
      console.log('Document added with ID: ', docRef.id)
      timeBoxEditorRef.value!.classList.add('animate-[var(--animate-blink-once)]')
      setTimeout(resetTimeBoxEditor, 100)
    } catch (e) {
      console.error('Error adding document: ', e)
    }
  } else {
    console.error("A field in the TimeBox isn't filled out.")
  }
}

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
    // lc tempDate: Date

    if (dynamicStartTime.value) {
      const tempDate = new Date(dynamicStartTime.value)
      tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value))
      dynamicEndTime.value = formatToDatetimeLocal(tempDate)
    } else {
      clearTimeout(dynamicDurationTypingTimer.value)
      dynamicDurationTypingTimer.value = setTimeout(() => {
        const now = new Date()
        const tempDate = new Date(
          now.setMinutes(now.getMinutes() - parseInt(dynamicDuration.value)),
        )
        dynamicStartTime.value = formatToDatetimeLocal(tempDate)
        tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value))
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
