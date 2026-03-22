<script setup lang="ts">
import type { PropType } from 'vue'

import { doc } from 'firebase/firestore'

import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import type { TimeBoxInput } from '~~/shared/worklog'
import { getWorklogErrorMessage, sortNamedEntities } from '~~/shared/worklog'

const props = defineProps({
  id: { type: String, default: undefined },
  startTimeFromTimer: { type: String, default: undefined },
  endTimeFromTimer: { type: String, default: undefined },
  initialStartTime: { type: String, default: undefined },
  initialEndTime: { type: String, default: undefined },
  initialNotes: { type: String, default: '' },
  initialProject: { type: String, default: '' },
  initialTags: { type: Array as PropType<string[]>, default: () => [] },
  resetAfterCreate: { type: Boolean, default: true },
  showCreateCancel: { type: Boolean, default: false },
  createButtonLabel: { type: String, default: 'Log Session' },
})

const emit = defineEmits(['toggleEditor', 'saved'])

const repositories = useWorklogRepository()
const shell = useHostShell()
const { hideTags } = useUserSettings()
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const timeBoxEditorRef = ref<HTMLElement | null>(null)
const mutationErrorMessage = ref('')

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
const showLegacyTagNotice = computed(() => hideTags.value && dynamicTags.value.length > 0)

const applyCreateDefaults = () => {
  dynamicStartTime.value = props.initialStartTime || props.startTimeFromTimer || ''
  dynamicEndTime.value = props.initialEndTime || props.endTimeFromTimer || ''
  dynamicNotes.value = props.initialNotes
  dynamicProject.value = props.initialProject
  dynamicTags.value = [...props.initialTags]
}

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
        mutationErrorMessage.value = ''
      }
    })
    .catch((error: unknown) => {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to load the session.')
    })
} else {
  applyCreateDefaults()
}

const updateTimeBoxDocument = async () => {
  if (!props.id) return

  const confirmed = shell.confirm(`Are you sure you want to update this Time Box?`)

  if (confirmed) {
    try {
      mutationErrorMessage.value = ''
      await repositories.timeBoxes.update(props.id, getTimeBoxInput())
      emit('saved', props.id)
      emit('toggleEditor')
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
    }
  } else {
    mutationErrorMessage.value = ''
    emit('toggleEditor')
  }
}

const createTimeBoxDocument = async () => {
  try {
    mutationErrorMessage.value = ''
    const createdId = await repositories.timeBoxes.create(getTimeBoxInput())
    emit('saved', createdId)

    if (props.resetAfterCreate) {
      timeBoxEditorRef.value?.classList.add('animate-[var(--animate-blink-once)]')
      setTimeout(resetTimeBoxEditor, 100)
    }
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save the session.')
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
  mutationErrorMessage.value = ''
  timeBoxEditorRef.value?.classList.remove('animate-[var(--animate-blink-once)]')
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
    if (props.id) return

    if (newValue) {
      dynamicStartTime.value = newValue
    } else {
      dynamicStartTime.value = props.initialStartTime || ''
    }
    mutationErrorMessage.value = ''
  },
)

watch(
  () => props.endTimeFromTimer,
  (newValue) => {
    if (props.id) return

    if (newValue) {
      dynamicEndTime.value = newValue
    } else {
      dynamicEndTime.value = props.initialEndTime || ''
    }
    mutationErrorMessage.value = ''
  },
)

watch(
  () => [
    props.initialStartTime,
    props.initialEndTime,
    props.initialNotes,
    props.initialProject,
    props.initialTags,
  ],
  () => {
    if (!props.id) {
      applyCreateDefaults()
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
  if (dynamicDurationTypingTimer.value) {
    clearTimeout(dynamicDurationTypingTimer.value)
  }
})
</script>

<template>
  <div
    ref="timeBoxEditorRef"
    class="my-4 rounded-sm border border-border-subtle bg-panel-editor px-6 py-4 font-data shadow-panel grayscale-10 *:my-2"
  >
    <div class="flex gap-15">
      <input
        v-model="dynamicDuration"
        class="relative h-max w-21.5 rounded-sm border border-border-strong bg-input px-2.5 py-1 text-right font-data text-4xl font-bold text-text tabular-nums"
        @input="mutationErrorMessage = ''"
      />
      <div class="flex flex-col gap-1">
        <div class="flex">
          <div class="w-18 font-bold">Start:</div>
          <input
            v-model="dynamicStartTime"
            type="datetime-local"
            class="font-data"
            @input="mutationErrorMessage = ''"
          />
        </div>
        <div class="flex">
          <div class="w-18 font-bold">End:</div>
          <input
            v-model="dynamicEndTime"
            type="datetime-local"
            @input="mutationErrorMessage = ''"
          />
        </div>
      </div>
    </div>
    <div class="flex py-4">
      <textarea
        v-model="dynamicNotes"
        class="w-full rounded-sm border border-border-strong bg-input p-2 text-text"
        rows="5"
        placeholder="Enter notes here..."
        @input="mutationErrorMessage = ''"
      ></textarea>
    </div>
    <div class="flex border-b border-border py-4">
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
            @change="mutationErrorMessage = ''"
          />
          {{ thisProject.name }}
        </label>
      </div>
    </div>
    <div
      class="py-4 pb-1"
      :class="hideTags ? 'rounded-md border border-border-subtle bg-surface px-3' : 'flex'"
    >
      <template v-if="!hideTags">
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
      </template>
      <template v-else>
        <span v-if="showLegacyTagNotice" class="text-sm text-text-muted">
          Existing tags on this session are preserved, but tag editing is hidden in project-first
          mode.
        </span>
        <span v-else class="text-sm text-text-muted">
          Tags are hidden in project-first mode. New sessions will save without tags.
        </span>
      </template>
    </div>
    <p v-if="mutationErrorMessage" class="text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
    <div v-if="props.id" class="mt-6! flex gap-3">
      <button
        class="ml-auto block cursor-pointer rounded-md bg-button-primary px-3 py-1 text-button-primary-text hover:bg-button-primary-hover"
        @click="emit('toggleEditor')"
      >
        Cancel
      </button>
      <button
        class="block cursor-pointer rounded-md bg-button-primary px-3 py-1 text-button-primary-text hover:bg-button-primary-hover"
        @click="updateTimeBoxDocument"
      >
        Update
      </button>
    </div>
  </div>
  <div v-if="!props.id && props.showCreateCancel" class="mt-6! flex gap-3">
    <button
      class="ml-auto block cursor-pointer rounded-md bg-button-secondary px-3 py-1 text-button-secondary-text hover:bg-button-secondary-hover"
      @click="emit('toggleEditor')"
    >
      Cancel
    </button>
    <button
      class="block cursor-pointer rounded-md bg-button-primary px-3 py-1 text-button-primary-text hover:bg-button-primary-hover"
      @click="createTimeBoxDocument"
    >
      {{ createButtonLabel }}
    </button>
  </div>
  <button
    v-if="!props.id && !props.showCreateCancel"
    class="w-full cursor-pointer rounded-sm bg-button-primary p-3 font-bold tracking-wider text-button-primary-text shadow-button-primary hover:brightness-120"
    @click="createTimeBoxDocument"
  >
    {{ createButtonLabel }}
  </button>
</template>
