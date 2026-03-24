<script setup lang="ts">
import { getDocs } from 'firebase/firestore'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from '#imports'

import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useWorklogRepository } from '~/composables/useWorklogRepository'
import {
  getProjectBadgeStyle,
  getProjectHeaderStyle,
  getProjectSoftSurfaceStyle,
  hasLowProjectContrast,
} from '~/utils/project-color-styles'
import { getProjectNewPath, getProjectPathFromProject } from '~/utils/worklog-routes'
import type { ProjectColors, ProjectInput } from '~~/shared/worklog'
import {
  createProjectPayload,
  getProjectDefaultMetadata,
  getWorklogErrorMessage,
  normalizeHexColor,
} from '~~/shared/worklog'

const router = useRouter()
const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { projectsCollection } = useFirestoreCollections()

const dynamicName = ref('')
const dynamicNotes = ref('')
const dynamicPrimaryColor = ref('#2563eb')
const dynamicSecondaryColor = ref('#06b6d4')
const secondaryColorEnabled = ref(true)
const mutationErrorMessage = ref('')
const isSaving = ref(false)
const initialFormSnapshot = ref<string | null>(null)
const allowNextNavigation = ref(false)

const previewColors = computed<ProjectColors>(() => ({
  primary: normalizeHexColor(dynamicPrimaryColor.value) ?? '#2563eb',
  secondary: secondaryColorEnabled.value
    ? (normalizeHexColor(dynamicSecondaryColor.value) ?? null)
    : null,
}))
const previewHeaderStyle = computed(() => getProjectHeaderStyle(previewColors.value))
const previewSurfaceStyle = computed(() => getProjectSoftSurfaceStyle(previewColors.value))
const previewBadgeStyle = computed(() => getProjectBadgeStyle(previewColors.value))
const lowContrastWarning = computed(() => hasLowProjectContrast(previewColors.value))

const createProjectInputSnapshot = (input: ProjectInput) => JSON.stringify(input)

const buildProjectInput = (): ProjectInput => ({
  name: dynamicName.value,
  notes: dynamicNotes.value,
  colors: {
    primary: dynamicPrimaryColor.value,
    secondary: secondaryColorEnabled.value ? dynamicSecondaryColor.value : null,
  },
  archived: false,
})

const isDirty = computed(
  () =>
    initialFormSnapshot.value !== null &&
    createProjectInputSnapshot(buildProjectInput()) !== initialFormSnapshot.value,
)

const applyProjectDefaults = (defaults: ReturnType<typeof getProjectDefaultMetadata>) => {
  dynamicNotes.value = defaults.notes
  dynamicPrimaryColor.value = defaults.colors.primary
  dynamicSecondaryColor.value = defaults.colors.secondary ?? defaults.colors.primary
  secondaryColorEnabled.value = defaults.colors.secondary !== null
  mutationErrorMessage.value = ''
  initialFormSnapshot.value = createProjectInputSnapshot(buildProjectInput())
}

const applyPalette = (colors: ProjectColors) => {
  dynamicPrimaryColor.value = colors.primary
  dynamicSecondaryColor.value = colors.secondary ?? colors.primary
  secondaryColorEnabled.value = colors.secondary !== null
  mutationErrorMessage.value = ''
}

const confirmDiscardChanges = async () => {
  if (!isDirty.value) {
    return true
  }

  return confirm({
    title: 'Discard unsaved new project?',
    message: 'Your edits will be lost.',
    confirmLabel: 'Discard changes',
    cancelLabel: 'Keep editing',
    variant: 'primary',
  })
}

const leaveCreateWorkspace = async () => {
  const okToLeave = await confirmDiscardChanges()

  if (!okToLeave) {
    return
  }

  allowNextNavigation.value = true

  try {
    await router.push('/projects')
  } finally {
    allowNextNavigation.value = false
  }
}

const saveProject = async () => {
  isSaving.value = true

  try {
    const nextInput = buildProjectInput()
    const payload = createProjectPayload(nextInput)

    mutationErrorMessage.value = ''

    const createdId = await repositories.projects.create(nextInput)

    initialFormSnapshot.value = createProjectInputSnapshot(nextInput)
    allowNextNavigation.value = true

    await router.push(
      getProjectPathFromProject({
        id: createdId,
        slug: payload.slug,
      }),
    )
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to create project.')
  } finally {
    allowNextNavigation.value = false
    isSaving.value = false
  }
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!isDirty.value) {
    return
  }

  event.preventDefault()
  event.returnValue = ''
}

applyProjectDefaults(getProjectDefaultMetadata(0))

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)

  if (!projectsCollection.value) {
    return
  }

  try {
    const snapshot = await getDocs(projectsCollection.value)

    if (!isDirty.value) {
      applyProjectDefaults(getProjectDefaultMetadata(snapshot.size))
    }
  } catch {
    // Keep the seeded defaults if the collection count cannot be fetched.
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

onBeforeRouteLeave(async (to) => {
  if (allowNextNavigation.value) {
    return true
  }

  if (to.path === getProjectNewPath()) {
    return true
  }

  return confirmDiscardChanges()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <ProjectWorkspaceHeader
      :active-mode="null"
      :badges="[]"
      :error-message="mutationErrorMessage"
      :header-style="previewHeaderStyle as Record<string, string>"
      :tabs="[]"
      :title="dynamicName.trim() || 'New project'"
    />

    <div class="flex-1 overflow-auto px-11 py-6">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <ProjectEditorFormLayout
          heading="Create project"
          :is-saving="isSaving"
          :low-contrast-warning="lowContrastWarning"
          :name="dynamicName"
          :notes="dynamicNotes"
          :preview-badge-style="previewBadgeStyle as Record<string, string>"
          :preview-header-style="previewHeaderStyle as Record<string, string>"
          preview-notes-fallback="Notes can help you frame the project before the first session."
          :preview-surface-style="previewSurfaceStyle as Record<string, string>"
          :primary-color="dynamicPrimaryColor"
          :secondary-color="dynamicSecondaryColor"
          :secondary-color-enabled="secondaryColorEnabled"
          submit-label="Create project"
          @apply-palette="applyPalette"
          @cancel="leaveCreateWorkspace"
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
</template>
