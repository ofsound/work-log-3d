<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import { getProjectBadgeStyle, getProjectModeToggleStyles } from '~/utils/project-color-styles'
import {
  buildProjectWorkspaceLocation,
  parseProjectRouteState,
  type ProjectRouteQuery,
  type ProjectWorkspaceMode,
} from '~/utils/project-route-state'
import {
  WORKSPACE_BODY_CONTENT_CLASS_NAME,
  WORKSPACE_BODY_X_CLASS_NAME,
} from '~/utils/workspace-subheader'
import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProject, toTimeBoxes } from '~/utils/worklog-firebase'
import type { ProjectColors, ProjectInput } from '~~/shared/worklog'
import {
  getProjectColorValidationMessages,
  getTotalDurationLabel,
  getWorklogErrorMessage,
  normalizeHexColor,
} from '~~/shared/worklog'

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
const dynamicSecondaryColor = ref('#0e7490')
const dynamicArchived = ref(false)
const mutationErrorMessage = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
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
  secondary:
    normalizeHexColor(dynamicSecondaryColor.value) ?? project.value?.colors.secondary ?? '#0e7490',
}))
const modeToggleStyles = computed(() => {
  const styles = getProjectModeToggleStyles(previewColors.value)

  return {
    container: styles.container as Record<string, string>,
    activeButton: styles.activeButton as Record<string, string>,
    inactiveButton: styles.inactiveButton as Record<string, string>,
  }
})
const previewBadgeStyle = computed(() => getProjectBadgeStyle(previewColors.value))
const colorValidationMessages = computed(() => {
  const primary = normalizeHexColor(dynamicPrimaryColor.value)
  const secondary = normalizeHexColor(dynamicSecondaryColor.value)
  const messages: string[] = []

  if (!primary) {
    messages.push('Primary color must be a valid hex color.')
  }

  if (!secondary) {
    messages.push('Secondary color must be a valid hex color.')
  }

  if (primary && secondary) {
    messages.push(...getProjectColorValidationMessages({ primary, secondary }))
  }

  return messages
})
const lastActivityLabel = computed(() => {
  const last = projectSummary.value.lastSession
  return last
    ? last.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : null
})
const headerBadges = computed(() => {
  const badges: {
    label: string
    style?: Record<string, string>
    variant?: 'outline' | 'accent'
  }[] = [
    {
      label: `${projectSummary.value.totalDurationLabel} hrs`,
      style: previewBadgeStyle.value as Record<string, string>,
    },
    {
      label: `${projectSummary.value.sessionCount} sessions`,
      variant: 'outline',
    },
  ]
  if (lastActivityLabel.value) {
    badges.push({ label: `Last activity ${lastActivityLabel.value}`, variant: 'outline' })
  }
  return badges
})

const createProjectInputSnapshot = (input: ProjectInput) => JSON.stringify(input)

const applyProjectToForm = (value: FirebaseProjectDocument | null | undefined) => {
  if (!value) {
    return
  }

  const normalized = toProject(value)
  dynamicName.value = normalized.name
  dynamicNotes.value = normalized.notes
  dynamicPrimaryColor.value = normalized.colors.primary
  dynamicSecondaryColor.value = normalized.colors.secondary
  dynamicArchived.value = normalized.archived
  mutationErrorMessage.value = ''
  initialFormSnapshot.value = createProjectInputSnapshot({
    name: normalized.name,
    notes: normalized.notes,
    colors: {
      primary: normalized.colors.primary,
      secondary: normalized.colors.secondary,
    },
    archived: normalized.archived,
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
  dynamicSecondaryColor.value = colors.secondary
  mutationErrorMessage.value = ''
}

const buildProjectInput = (): ProjectInput => ({
  name: dynamicName.value,
  notes: dynamicNotes.value,
  colors: {
    primary: dynamicPrimaryColor.value,
    secondary: dynamicSecondaryColor.value,
  },
  archived: dynamicArchived.value,
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

const deleteProject = async () => {
  if (!project.value) {
    return
  }

  const displayName = dynamicName.value.trim() || project.value.name || 'this project'
  const confirmed = await confirm({
    title: `Delete project “${displayName}”?`,
    message: 'This cannot be undone.',
    variant: 'danger',
  })

  if (!confirmed) {
    return
  }

  isDeleting.value = true

  try {
    mutationErrorMessage.value = ''
    await repositories.projects.remove(props.id)
    allowNextNavigation.value = true
    await router.push('/projects')
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to delete project.')
  } finally {
    allowNextNavigation.value = false
    isDeleting.value = false
  }
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
      :mode-toggle-styles="modeToggleStyles"
      :title="dynamicName.trim() || project.name || 'Untitled project'"
      @select-mode="handleWorkspaceModeSelect"
    />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        data-test="project-editor-scroll-region"
        :class="['flex-1 overflow-auto py-6', WORKSPACE_BODY_X_CLASS_NAME]"
      >
        <div :class="[WORKSPACE_BODY_CONTENT_CLASS_NAME, 'flex flex-col gap-6 pb-8']">
          <ProjectEditorFormLayout
            :archived="dynamicArchived"
            :color-validation-messages="colorValidationMessages"
            heading="Edit Project"
            :is-saving="isSaving"
            :name="dynamicName"
            :notes="dynamicNotes"
            :preview-colors="previewColors"
            :primary-color="dynamicPrimaryColor"
            :secondary-color="dynamicSecondaryColor"
            :show-inline-actions="false"
            show-archive-toggle
            submit-label="Save project"
            @apply-palette="applyPalette"
            @cancel="cancelEditing"
            @clear-error="mutationErrorMessage = ''"
            @save="saveProject"
            @update:archived="dynamicArchived = $event"
            @update:name="dynamicName = $event"
            @update:notes="dynamicNotes = $event"
            @update:primary-color="dynamicPrimaryColor = $event"
            @update:secondary-color="dynamicSecondaryColor = $event"
          />

          <ContainerCard as="section" padding="default" variant="danger">
            <h2 class="text-sm font-bold tracking-wide text-danger uppercase">Danger zone</h2>
            <p class="mt-2 max-w-xl text-sm text-text">
              Permanently delete this project. Sessions that use this project must be removed or
              reassigned first, or deletion will fail.
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <AppButton size="sm" variant="danger" :disabled="isDeleting" @click="deleteProject">
                {{ isDeleting ? 'Deleting…' : 'Delete project' }}
              </AppButton>
            </div>
          </ContainerCard>
        </div>
      </div>

      <div
        data-test="project-editor-footer"
        class="shrink-0 border-t border-border-subtle bg-surface-strong px-[var(--spacing-workspace-content-x)] py-4"
      >
        <div
          :class="[
            WORKSPACE_BODY_CONTENT_CLASS_NAME,
            'flex flex-wrap items-center justify-end gap-3',
          ]"
        >
          <AppButton variant="secondary" @click="cancelEditing">Cancel</AppButton>
          <AppButton variant="primary" :disabled="isSaving" @click="saveProject">
            {{ isSaving ? 'Saving...' : 'Save project' }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="flex h-full items-center justify-center px-6 py-6">
    <ContainerCard class="rounded-3xl px-6 py-8 text-center" padding="comfortable">
      <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Loading</div>
      <div class="mt-2 text-xl font-bold text-text">Loading project details</div>
    </ContainerCard>
  </div>
</template>
