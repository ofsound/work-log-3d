<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import {
  getProjectBadgeStyle,
  getProjectHeaderStyle,
  getProjectSoftSurfaceStyle,
  getProjectSwatchStyle,
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
import {
  getTotalDurationLabel,
  normalizeHexColor,
  PROJECT_COLOR_PALETTE,
  getWorklogErrorMessage,
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
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section
            class="rounded-3xl border border-border-subtle bg-surface px-6 py-6 shadow-panel"
          >
            <div class="mb-6">
              <div class="text-xs tracking-[0.2em] text-text-subtle uppercase">Metadata</div>
              <h1 class="mt-2 text-2xl font-bold text-text">Edit project details</h1>
            </div>

            <div class="flex flex-col gap-5">
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">Project name</span>
                <input
                  v-model="dynamicName"
                  type="text"
                  class="rounded-2xl border border-input-border bg-input px-4 py-3 text-text"
                  placeholder="Project name"
                  @input="mutationErrorMessage = ''"
                />
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">Internal notes</span>
                <textarea
                  v-model="dynamicNotes"
                  rows="8"
                  class="rounded-2xl border border-input-border bg-input px-4 py-3 text-text"
                  placeholder="Reference notes, goals, reminders, or project context"
                  @input="mutationErrorMessage = ''"
                ></textarea>
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="flex flex-col gap-2">
                  <span class="text-sm font-semibold text-text">Primary color</span>
                  <div
                    class="flex items-center gap-3 rounded-2xl border border-input-border bg-input px-3 py-3"
                  >
                    <input
                      v-model="dynamicPrimaryColor"
                      type="color"
                      class="h-10 w-14 cursor-pointer rounded-lg border border-input-border bg-transparent"
                      @input="mutationErrorMessage = ''"
                    />
                    <input
                      v-model="dynamicPrimaryColor"
                      type="text"
                      class="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 font-data text-text"
                      placeholder="#2563eb"
                      @input="mutationErrorMessage = ''"
                    />
                  </div>
                </label>

                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-semibold text-text">Secondary color</span>
                    <button
                      type="button"
                      class="cursor-pointer rounded-full border border-button-secondary-border bg-button-secondary px-3 py-1 text-xs font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
                      @click="secondaryColorEnabled = !secondaryColorEnabled"
                    >
                      {{ secondaryColorEnabled ? 'Disable' : 'Enable' }}
                    </button>
                  </div>

                  <div
                    class="flex items-center gap-3 rounded-2xl border px-3 py-3"
                    :class="
                      secondaryColorEnabled
                        ? 'border-input-border bg-input'
                        : 'border-border-subtle bg-surface-muted opacity-65'
                    "
                  >
                    <input
                      v-model="dynamicSecondaryColor"
                      type="color"
                      class="h-10 w-14 cursor-pointer rounded-lg border border-input-border bg-transparent"
                      :disabled="!secondaryColorEnabled"
                      @input="mutationErrorMessage = ''"
                    />
                    <input
                      v-model="dynamicSecondaryColor"
                      type="text"
                      class="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 font-data text-text"
                      placeholder="#06b6d4"
                      :disabled="!secondaryColorEnabled"
                      @input="mutationErrorMessage = ''"
                    />
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-semibold text-text">Palette presets</span>
                  <span class="text-xs text-text-subtle">Tap a swatch</span>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="(palette, index) in PROJECT_COLOR_PALETTE"
                    :key="`${palette.primary}-${palette.secondary}`"
                    type="button"
                    class="size-9 shrink-0 cursor-pointer rounded-full border border-white/25 shadow-control transition-[box-shadow,filter] duration-150 ease-out hover:shadow-[var(--shadow-panel)] hover:brightness-[1.05] focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
                    :style="getProjectSwatchStyle(palette)"
                    :aria-label="`Apply color preset ${index + 1}`"
                    :title="`${palette.primary}${palette.secondary ? ` / ${palette.secondary}` : ''}`"
                    @click="applyPalette(palette)"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  class="cursor-pointer rounded-xl border border-button-secondary-border bg-button-secondary px-4 py-2 font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
                  @click="cancelEditing"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="cursor-pointer rounded-xl bg-button-primary px-4 py-2 font-semibold text-button-primary-text hover:bg-button-primary-hover"
                  :disabled="isSaving"
                  @click="saveProject"
                >
                  {{ isSaving ? 'Saving...' : 'Save project' }}
                </button>
              </div>
            </div>
          </section>

          <section class="flex flex-col gap-4">
            <div
              class="rounded-3xl border border-border-subtle px-5 py-5 shadow-panel"
              :style="previewSurfaceStyle"
            >
              <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Live preview</div>
              <div
                class="mt-4 overflow-hidden rounded-3xl border border-white/20 bg-surface shadow-panel"
              >
                <div class="px-5 py-5" :style="previewHeaderStyle">
                  <div class="text-xs tracking-[0.18em] uppercase opacity-80">Project header</div>
                  <div class="mt-2 text-2xl font-bold">
                    {{ dynamicName.trim() || 'Project preview' }}
                  </div>
                </div>
                <div class="flex flex-col gap-4 px-5 py-5">
                  <div class="flex flex-wrap items-center gap-2">
                    <div
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :style="previewBadgeStyle"
                    >
                      Example badge
                    </div>
                    <div
                      class="rounded-full border px-3 py-1 text-xs font-semibold text-text"
                      :style="previewSurfaceStyle"
                    >
                      Subtle project surface
                    </div>
                  </div>
                  <p class="text-sm text-text-muted">
                    {{ dynamicNotes.trim() || 'Notes remain private to the edit page for now.' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="rounded-3xl border border-border-subtle bg-surface px-5 py-5 shadow-panel">
              <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">
                Project context
              </div>
              <div class="mt-4 flex flex-col gap-3 text-sm text-text">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-text-subtle">Sessions</span>
                  <span class="font-semibold">{{ projectSummary.sessionCount }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-text-subtle">Logged hours</span>
                  <span class="font-semibold">{{ projectSummary.totalDurationLabel }} hrs</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-text-subtle">Last activity</span>
                  <span class="font-semibold">
                    {{
                      projectSummary.lastSession
                        ? projectSummary.lastSession.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'No sessions yet'
                    }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="lowContrastWarning"
              class="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-control dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
            >
              This color pairing may reduce contrast in some project surfaces. The preview keeps the
              current choice, but you may want more separation between the two colors.
            </div>
          </section>
        </div>
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
