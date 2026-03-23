<script setup lang="ts">
import { doc } from 'firebase/firestore'

import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { PropType } from 'vue'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import { getProjectPath, getTagPath } from '~/utils/worklog-routes'
import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import {
  findProject,
  findProjectName,
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

const tagEntries = computed(() => {
  const ids = timeBox.value?.tags ?? []
  const tags = toTags(allTags.value as FirebaseTagDocument[])

  return ids.map((id) => ({
    id,
    name: tags.find((tag) => tag.id === id)?.name ?? id,
  }))
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

const projectSurfaceStyle = computed(() => {
  if (props.variant === 'project') {
    return {}
  }

  return project.value ? getProjectSoftSurfaceStyle(project.value.colors) : {}
})
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
        <NuxtLink
          v-if="timeBox?.project"
          :to="getProjectPath(timeBox.project)"
          class="relative -top-px inline-flex max-w-full min-w-0 items-center rounded-full border px-3 py-1 text-sm font-bold no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
          :style="projectBadgeStyle"
        >
          <HighlightedText :text="projectName" :tokens="highlightTokens" />
        </NuxtLink>
        <div
          v-else
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
    <div v-if="!hideTags" class="flex flex-wrap gap-2">
      <NuxtLink
        v-for="thisTag in tagEntries"
        :key="thisTag.id"
        :to="getTagPath(thisTag.id)"
        class="inline-flex max-w-full min-w-0 items-center rounded-xl bg-chip px-3 py-0.5 font-data text-sm text-chip-text no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <div class="relative -top-px">
          <HighlightedText :text="thisTag.name" :tokens="highlightTokens" />
        </div>
      </NuxtLink>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
  <div
    v-if="isMinimized"
    class="mb-2.5 rounded-xl border px-3 py-2"
    :class="variant === 'project' ? 'border-border-subtle bg-surface-subtle' : ''"
    :style="variant === 'project' ? {} : projectSurfaceStyle"
  >
    <NuxtLink
      v-if="variant !== 'project' && timeBox?.project"
      :to="getProjectPath(timeBox.project)"
      class="mb-2 inline-flex max-w-full min-w-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold tracking-[0.16em] uppercase no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
      :style="projectBadgeStyle"
    >
      <HighlightedText :text="projectName" :tokens="highlightTokens" />
    </NuxtLink>
    <div
      v-else-if="variant !== 'project'"
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
