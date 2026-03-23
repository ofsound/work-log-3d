<script setup lang="ts">
import { doc } from 'firebase/firestore'

import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { PropType } from 'vue'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import {
  findProject,
  findProjectName,
  findTagNames,
  getDurationMinutesLabel,
  getWorklogErrorMessage,
} from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { hideTags } = useUserSettings()
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
  variant: { type: String, default: undefined },
  isMinimized: { type: Boolean, default: false },
  highlightTokens: { type: Array as PropType<string[]>, default: () => [] },
  flushTop: { type: Boolean, default: false },
})

const emit = defineEmits(['toggleEditor'])
const mutationErrorMessage = ref('')

const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const rawTimeBoxSource = computed(() =>
  timeBoxesCollection.value ? doc(timeBoxesCollection.value, props.id) : null,
)
const rawTimeBox = useDocument(rawTimeBoxSource, {
  ssrKey: `time-box-viewer-${props.id}`,
})
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
const project = computed(() =>
  findProject(
    toProjects(allProjects.value as FirebaseProjectDocument[]),
    timeBox.value?.project ?? '',
  ),
)

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

const requestDeleteSession = async () => {
  const ok = await confirm({
    title: 'Delete this session?',
    message: 'This cannot be undone.',
    variant: 'danger',
  })

  if (!ok) {
    return
  }

  try {
    await repositories.timeBoxes.remove(props.id)
    mutationErrorMessage.value = ''
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to delete session.')
  }
}

const projectSurfaceStyle = computed(() =>
  project.value ? getProjectSoftSurfaceStyle(project.value.colors) : {},
)
const projectBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)
</script>

<template>
  <div
    v-if="!isMinimized"
    class="relative rounded-sm border bg-panel-session px-6 py-4 shadow-panel"
    :class="props.flushTop ? 'mt-0 mb-4' : 'my-4'"
    :style="projectSurfaceStyle"
  >
    <button
      class="absolute right-4 bottom-3 cursor-pointer px-1 text-text-subtle hover:text-text"
      @click="emit('toggleEditor')"
    >
      <EditIcon />
    </button>
    <button
      type="button"
      class="absolute right-4 cursor-pointer px-1 text-text-subtle hover:text-text"
      aria-label="Delete session"
      @click="requestDeleteSession"
    >
      <DeleteIcon />
    </button>
    <div class="flex items-baseline gap-2 border-b border-border pb-2">
      <div class="w-max rounded-sm text-2xl font-bold">
        {{ timeBoxDuration }}
      </div>
      <div v-if="variant !== 'project'" class="flex items-baseline gap-2">
        <div class="relative -top-0.5 font-bold">–</div>
        <div
          class="relative -top-px rounded-full border px-3 py-1 text-sm font-bold"
          :style="projectBadgeStyle"
        >
          <HighlightedText :text="projectName" :tokens="highlightTokens" />
        </div>
      </div>
    </div>
    <div class="mt-3 font-data">{{ startDayFormatted }}</div>
    <div class="mt-px font-data text-sm italic">
      {{ startTimeFormatted }} &mdash; {{ endTimeFormatted }}
    </div>
    <div class="my-5 font-data">
      <HighlightedText :text="timeBox?.notes ?? ''" :tokens="highlightTokens" />
    </div>
    <div v-if="!hideTags" class="flex gap-2">
      <div
        v-for="thisTag in tagNames"
        :key="thisTag"
        class="rounded-xl bg-chip px-3 py-0.5 font-data text-sm text-chip-text"
      >
        <div class="relative -top-px">
          <HighlightedText :text="thisTag" :tokens="highlightTokens" />
        </div>
      </div>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
  <div v-if="isMinimized" class="mb-2.5 rounded-xl border px-3 py-2" :style="projectSurfaceStyle">
    <div
      v-if="variant !== 'project'"
      class="mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold tracking-[0.16em] uppercase"
      :style="projectBadgeStyle"
    >
      <HighlightedText :text="projectName" :tokens="highlightTokens" />
    </div>
    <div class="pb-2 font-data">
      <HighlightedText :text="timeBox?.notes ?? ''" :tokens="highlightTokens" />
      <span class="ml-2 text-xs font-bold italic"
        ><span class="text-text-subtle">[</span> {{ timeBoxDuration }}
        <span class="text-text-subtle">]</span></span
      >
    </div>
  </div>
</template>
