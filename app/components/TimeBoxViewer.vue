<script setup lang="ts">
import { doc } from 'firebase/firestore'

import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { PropType } from 'vue'
import {
  getProjectAccentTextStyle,
  getProjectBadgeStyle,
  getProjectOpaqueSoftSurfaceStyle,
  getProjectSoftSurfaceStyle,
} from '~/utils/project-color-styles'
import { getSessionsSearchRouteForTag } from '~/utils/sessions-route-state'
import { getProjectPath, getProjectPathFromProject } from '~/utils/worklog-routes'
import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import {
  findProject,
  findProjectName,
  getTimeBoxDurationMinutes,
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
  interactive: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  /** Tighter vertical stack for minimized rows (e.g. project list view). */
  compact: { type: Boolean, default: false },
  highlightTokens: { type: Array as PropType<string[]>, default: () => [] },
  hideProjectChip: { type: Boolean, default: false },
  embeddedInPanel: { type: Boolean, default: false },
  flushTop: { type: Boolean, default: false },
  opaqueSurface: { type: Boolean, default: false },
  hideActions: { type: Boolean, default: false },
  useProjectCardStyles: { type: Boolean, default: true },
})

const emit = defineEmits(['toggleEditor', 'deleted', 'open'])
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

  return ids.map((id) => {
    const tag = tags.find((t) => t.id === id)
    return {
      id,
      name: tag?.name ?? id,
      slug: tag?.slug ?? '',
    }
  })
})

const timeBoxDuration = computed(() =>
  timeBox.value ? getTimeBoxDurationMinutes(timeBox.value) : 0,
)

const sessionStartMetaLabel = computed(() => {
  const start = timeBox.value?.startTime
  if (!start) {
    return ''
  }

  return start.toLocaleString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
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
    // Close the sidebar before awaiting delete so Firestore never paints a frame with a
    // missing document (0m / empty placeholders) while the panel is still open.
    emit('deleted')
    await repositories.timeBoxes.remove(props.id)
  } catch (error) {
    await confirm({
      title: 'Unable to delete session',
      message: getWorklogErrorMessage(error, 'Unable to delete session.'),
      confirmLabel: 'OK',
      variant: 'primary',
    })
  }
}

/** Same soft tint as project rows on `/projects` (ProjectsManagerProject). */
const sessionCardStyle = computed(() => {
  if (!props.useProjectCardStyles || props.variant === 'project' || !project.value) {
    return {}
  }

  return props.opaqueSurface
    ? getProjectOpaqueSoftSurfaceStyle(project.value.colors)
    : getProjectSoftSurfaceStyle(project.value.colors)
})
const projectBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)
const projectTextStyle = computed(() =>
  project.value ? getProjectAccentTextStyle(project.value.colors) : {},
)
const isOverviewVariant = computed(() => props.variant === 'overview')
</script>

<template>
  <ContainerCard
    v-if="!isMinimized"
    :as="isOverviewVariant ? 'button' : 'article'"
    class="relative rounded-xl py-4"
    :class="[props.flushTop ? 'mt-0 mb-4' : 'my-4', isOverviewVariant ? 'text-left' : '']"
    :interactive="isOverviewVariant ? props.interactive : false"
    padding="compact"
    :selected="isOverviewVariant ? props.selected : false"
    :style="sessionCardStyle"
    :type="isOverviewVariant ? 'button' : undefined"
    variant="subtle"
    @click="isOverviewVariant ? emit('open') : undefined"
  >
    <div v-if="!isOverviewVariant && !hideActions" class="absolute top-4 right-4 z-10 flex gap-0.5">
      <button
        type="button"
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        aria-label="Edit session"
        @click="emit('toggleEditor')"
      >
        <EditIcon />
      </button>
      <button
        type="button"
        class="cursor-pointer px-1 text-text-subtle hover:text-text"
        aria-label="Delete session"
        @click="requestDeleteSession"
      >
        <DeleteIcon />
      </button>
    </div>

    <div class="flex flex-col gap-3 pr-14">
      <div class="min-w-0">
        <div v-if="variant !== 'project'" class="flex flex-col">
          <div class="inline-flex items-center gap-2">
            <NuxtLink
              v-if="!isOverviewVariant && !hideProjectChip && timeBox?.project"
              :to="project ? getProjectPathFromProject(project) : getProjectPath(timeBox.project)"
              class="mb-1 inline-flex max-w-full min-w-0 items-center text-xl font-bold no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
              :style="projectTextStyle"
            >
              <HighlightedText :text="projectName" :tokens="highlightTokens" />
            </NuxtLink>
            <div
              v-else-if="!hideProjectChip"
              class="mb-1 inline-flex text-xl font-bold"
              :style="projectTextStyle"
            >
              <HighlightedText :text="projectName" :tokens="highlightTokens" />
            </div>
            <DurationPill
              v-if="variant !== 'project'"
              format="minutes"
              :minutes="timeBoxDuration"
              :style="projectBadgeStyle"
              tone="project"
              variant="compact"
            />
          </div>
          <div
            v-if="
              variant !== 'sessions-day' &&
              !isOverviewVariant &&
              !embeddedInPanel &&
              sessionStartMetaLabel
            "
            class="w-full font-medium text-text"
          >
            {{ sessionStartMetaLabel }}
          </div>
          <div class="text-sm text-text tabular-nums">
            {{ startTimeFormatted }} &mdash; {{ endTimeFormatted }}
          </div>
        </div>
        <div class="mt-4 mb-5 font-data">
          <HighlightedText :text="timeBox?.notes ?? ''" :tokens="highlightTokens" />
        </div>
        <div v-if="!hideTags && !isOverviewVariant" class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="thisTag in tagEntries"
            :key="thisTag.id"
            :to="getSessionsSearchRouteForTag(thisTag.id)"
            class="inline-flex max-w-full min-w-0 items-center rounded-xl bg-chip px-3 py-0.5 font-data text-sm text-chip-text no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <div class="relative -top-px">
              <HighlightedText :text="thisTag.name" :tokens="highlightTokens" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </ContainerCard>
  <ContainerCard
    v-if="isMinimized"
    class="!rounded-none !border-0 !bg-transparent px-3 py-2 shadow-none"
    :class="props.compact ? 'mb-0' : 'mb-2.5'"
    padding="compact"
    :variant="variant === 'project' ? 'muted' : 'subtle'"
  >
    <NuxtLink
      v-if="variant !== 'project' && timeBox?.project"
      :to="project ? getProjectPathFromProject(project) : getProjectPath(timeBox.project)"
      class="mb-2 inline-flex max-w-full min-w-0 items-center text-xs font-bold tracking-[0.16em] uppercase no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
      :style="projectTextStyle"
    >
      <HighlightedText :text="projectName" :tokens="highlightTokens" />
    </NuxtLink>
    <div
      v-else-if="variant !== 'project'"
      class="mb-2 inline-flex text-xs font-bold tracking-[0.16em] uppercase"
      :style="projectTextStyle"
    >
      <HighlightedText :text="projectName" :tokens="highlightTokens" />
    </div>
    <div class="pb-2 font-data">
      <HighlightedText :text="timeBox?.notes ?? ''" :tokens="highlightTokens" />
      <DurationPill
        class="ml-2 shrink-0"
        format="minutes"
        :minutes="timeBoxDuration"
        :style="projectBadgeStyle"
        tone="project"
        variant="compact"
      />
    </div>
  </ContainerCard>
</template>
