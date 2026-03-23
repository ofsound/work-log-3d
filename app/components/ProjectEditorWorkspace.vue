<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import {
  getProjectBadgeStyle,
  getProjectHeaderStyle,
  getProjectSoftSurfaceStyle,
  hasLowProjectContrast,
} from '~/utils/project-color-styles'
import {
  buildProjectWorkspaceLocation,
  parseProjectRouteState,
  type ProjectRouteQuery,
  type ProjectWorkspaceMode,
} from '~/utils/project-route-state'
import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProject, toTimeBoxes } from '~/utils/worklog-firebase'
import type { ProjectColors, ProjectInput } from '~~/shared/worklog'
import { getTotalDurationLabel, normalizeHexColor, getWorklogErrorMessage } from '~~/shared/worklog'

const props = defineProps<{
  id: string
}>()

const route = useRoute()
const router = useRouter()

const projectPathSegment = computed(() => {
  const p = route.params.id
  const raw = Array.isArray(p) ? p[0] : p
  return raw ?? ''
})
const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()

const projectDocumentSource = computed(() =>
  projectsCollection.value ? doc(projectsCollection.value, props.id) : null,
)
const projectDocument = useDocument(projectDocumentSource, {
  ssrKey: `project-editor-${props.id}`,
})
const projectTimeBoxesQuery = computed(() =>
  timeBoxesCollection.value
    ? query(timeBoxesCollection.value, where('project', '==', props.id))
    : null,
)
const projectTimeBoxes = useCollection(projectTimeBoxesQuery, {
  ssrKey: `project-editor-timeboxes-${props.id}`,
})

const dynamicName = ref('')
const dynamicNotes = ref('')
const dynamicPrimaryColor = ref('#2563eb')
const dynamicSecondaryColor = ref('#06b6d4')
const secondaryColorEnabled = ref(true)
const mutationErrorMessage = ref('')
const isSaving = ref(false)
const initialFormSnapshot = ref<string | null>(null)
const allowNextNavigation = ref(false)

const project = computed(() =>
  projectDocument.value ? toProject(projectDocument.value as FirebaseProjectDocument) : null,
)
const routeQuery = computed(() => route.query as ProjectRouteQuery)
const routeState = computed(() => parseProjectRouteState(routeQuery.value))
const resolvedProjectTimeBoxes = computed(() =>
  toTimeBoxes(projectTimeBoxes.value as FirebaseTimeBoxDocument[]),
)
const projectSummary = computed(() => ({
  sessionCount: resolvedProjectTimeBoxes.value.length,
  totalDurationLabel: getTotalDurationLabel(resolvedProjectTimeBoxes.value),
  lastSession:
    resolvedProjectTimeBoxes.value
      .filter((timeBox) => timeBox.startTime)
      .sort(
        (left, right) => (right.startTime?.valueOf() ?? 0) - (left.startTime?.valueOf() ?? 0),
      )[0]?.startTime ?? null,
}))

const previewColors = computed<ProjectColors>(() => ({
  primary:
    normalizeHexColor(dynamicPrimaryColor.value) ?? project.value?.colors.primary ?? '#2563eb',
  secondary: secondaryColorEnabled.value
    ? (normalizeHexColor(dynamicSecondaryColor.value) ?? null)
    : null,
}))
const previewHeaderStyle = computed(() => getProjectHeaderStyle(previewColors.value))
const previewSurfaceStyle = computed(() => getProjectSoftSurfaceStyle(previewColors.value))
const previewBadgeStyle = computed(() => getProjectBadgeStyle(previewColors.value))
const lowContrastWarning = computed(() => hasLowProjectContrast(previewColors.value))
const headerBadges = computed(() => [
  {
    label: `${projectSummary.value.totalDurationLabel} hrs`,
    style: previewBadgeStyle.value as Record<string, string>,
  },
  {
    label: `${projectSummary.value.sessionCount} sessions`,
    variant: 'outline' as const,
  },
])

const createProjectInputSnapshot = (input: ProjectInput) => JSON.stringify(input)

const applyProjectToForm = (value: FirebaseProjectDocument | null | undefined) => {
  if (!value) {
    return
  }

  const normalized = toProject(value)
  dynamicName.value = normalized.name
  dynamicNotes.value = normalized.notes
  dynamicPrimaryColor.value = normalized.colors.primary
  dynamicSecondaryColor.value = normalized.colors.secondary ?? normalized.colors.primary
  secondaryColorEnabled.value = normalized.colors.secondary !== null
  mutationErrorMessage.value = ''
  initialFormSnapshot.value = createProjectInputSnapshot({
    name: normalized.name,
    notes: normalized.notes,
    colors: {
      primary: normalized.colors.primary,
      secondary: normalized.colors.secondary,
    },
  })
}

watch(
  () => projectDocument.value,
  (value) => {
    applyProjectToForm(value as FirebaseProjectDocument | null | undefined)
  },
  { immediate: true },
)

const applyPalette = (colors: ProjectColors) => {
  dynamicPrimaryColor.value = colors.primary
  dynamicSecondaryColor.value = colors.secondary ?? colors.primary
  secondaryColorEnabled.value = colors.secondary !== null
  mutationErrorMessage.value = ''
}

const buildProjectInput = (): ProjectInput => ({
  name: dynamicName.value,
  notes: dynamicNotes.value,
  colors: {
    primary: dynamicPrimaryColor.value,
    secondary: secondaryColorEnabled.value ? dynamicSecondaryColor.value : null,
  },
})

const isDirty = computed(
  () =>
    initialFormSnapshot.value !== null &&
    createProjectInputSnapshot(buildProjectInput()) !== initialFormSnapshot.value,
)

const confirmDiscardChanges = async () => {
  if (!isDirty.value) {
    return true
  }

  return confirm({
    title: `Discard unsaved changes to “${project.value?.name ?? 'this project'}”?`,
    message: 'Your edits will be lost.',
    confirmLabel: 'Discard changes',
    cancelLabel: 'Keep editing',
    variant: 'primary',
  })
}

const navigateToWorkspaceMode = async (mode: ProjectWorkspaceMode) => {
  if (mode === 'edit') {
    return
  }

  const okToLeave = await confirmDiscardChanges()

  if (!okToLeave) {
    return
  }

  allowNextNavigation.value = true

  try {
    await router.push(
      buildProjectWorkspaceLocation(
        projectPathSegment.value,
        mode,
        routeState.value,
        routeQuery.value,
      ),
    )
  } finally {
    allowNextNavigation.value = false
  }
}

const saveProject = async () => {
  if (!project.value) {
    return
  }

  isSaving.value = true

  try {
    const nextInput = buildProjectInput()

    mutationErrorMessage.value = ''
    await repositories.projects.update(props.id, nextInput)
    initialFormSnapshot.value = createProjectInputSnapshot(nextInput)
    allowNextNavigation.value = true
    await router.push(
      buildProjectWorkspaceLocation(
        projectPathSegment.value,
        routeState.value.mode,
        routeState.value,
        routeQuery.value,
      ),
    )
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save project details.')
  } finally {
    allowNextNavigation.value = false
    isSaving.value = false
  }
}

const cancelEditing = async () => {
  await navigateToWorkspaceMode(routeState.value.mode)
}

const handleWorkspaceModeSelect = async (mode: ProjectWorkspaceMode) => {
  await navigateToWorkspaceMode(mode)
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!isDirty.value) {
    return
  }

  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

onBeforeRouteLeave(async () => {
  if (allowNextNavigation.value) {
    return true
  }

  return confirmDiscardChanges()
})
</script>

<template>
  <div v-if="project" class="flex h-full min-h-0 flex-col overflow-hidden">
    <ProjectWorkspaceHeader
      active-mode="edit"
      :badges="headerBadges"
      :error-message="mutationErrorMessage"
      :header-style="previewHeaderStyle as Record<string, string>"
      :title="dynamicName.trim() || project.name || 'Untitled project'"
      @select-mode="handleWorkspaceModeSelect"
    />

    <div class="flex-1 overflow-auto px-6 py-6">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <ProjectEditorFormLayout
          :context-summary="projectSummary"
          heading="Edit project details"
          :is-saving="isSaving"
          :low-contrast-warning="lowContrastWarning"
          :name="dynamicName"
          :notes="dynamicNotes"
          :preview-badge-style="previewBadgeStyle as Record<string, string>"
          :preview-header-style="previewHeaderStyle as Record<string, string>"
          :preview-surface-style="previewSurfaceStyle as Record<string, string>"
          :primary-color="dynamicPrimaryColor"
          :secondary-color="dynamicSecondaryColor"
          :secondary-color-enabled="secondaryColorEnabled"
          submit-label="Save project"
          @apply-palette="applyPalette"
          @cancel="cancelEditing"
          @clear-error="mutationErrorMessage = ''"
          @save="saveProject"
          @update:name="dynamicName = $event"
          @update:notes="dynamicNotes = $event"
          @update:primary-color="dynamicPrimaryColor = $event"
          @update:secondary-color="dynamicSecondaryColor = $event"
          @update:secondary-color-enabled="secondaryColorEnabled = $event"
        />
      </div>
    </div>
  </div>
  <div v-else class="flex h-full items-center justify-center px-6 py-6">
    <div
      class="rounded-3xl border border-border-subtle bg-surface px-6 py-8 text-center shadow-panel"
    >
      <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Loading</div>
      <div class="mt-2 text-xl font-bold text-text">Loading project details</div>
    </div>
  </div>
</template>
