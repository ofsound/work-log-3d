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
} from '~/utils/project-color-styles'
import { getProjectNewPath, getProjectPathFromProject } from '~/utils/worklog-routes'
import type { ProjectColors, ProjectInput } from '~~/shared/worklog'
import {
  analyzeProjectColors,
  createProjectPayload,
  getProjectDefaultMetadata,
  getWorklogErrorMessage,
  normalizeHexColor,
  PRIMARY_COLOR_BADGE_TEXT_ERROR,
  SECONDARY_COLOR_GRADIENT_TEXT_ERROR,
} from '~~/shared/worklog'

const router = useRouter()
const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { projectsCollection } = useFirestoreCollections()

const dynamicName = ref('')
const dynamicNotes = ref('')
const dynamicPrimaryColor = ref('#2563eb')
const dynamicSecondaryColor = ref('#0e7490')
const mutationErrorMessage = ref('')
const isSaving = ref(false)
const initialFormSnapshot = ref<string | null>(null)
const allowNextNavigation = ref(false)

const previewColors = computed<ProjectColors>(() => ({
  primary: normalizeHexColor(dynamicPrimaryColor.value) ?? '#2563eb',
  secondary: normalizeHexColor(dynamicSecondaryColor.value) ?? '#0e7490',
}))
const previewHeaderStyle = computed(() => getProjectHeaderStyle(previewColors.value))
const previewSurfaceStyle = computed(() => getProjectSoftSurfaceStyle(previewColors.value))
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
    const analysis = analyzeProjectColors({ primary, secondary })

    if (!analysis.primarySupportsBadgeText) {
      messages.push(PRIMARY_COLOR_BADGE_TEXT_ERROR)
    }

    if (!analysis.hasAccessibleGradientText) {
      messages.push(SECONDARY_COLOR_GRADIENT_TEXT_ERROR)
    }
  }

  return messages
})

const createProjectInputSnapshot = (input: ProjectInput) => JSON.stringify(input)

const buildProjectInput = (): ProjectInput => ({
  name: dynamicName.value,
  notes: dynamicNotes.value,
  colors: {
    primary: dynamicPrimaryColor.value,
    secondary: dynamicSecondaryColor.value,
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
  dynamicSecondaryColor.value = defaults.colors.secondary
  mutationErrorMessage.value = ''
  initialFormSnapshot.value = createProjectInputSnapshot(buildProjectInput())
}

const applyPalette = (colors: ProjectColors) => {
  dynamicPrimaryColor.value = colors.primary
  dynamicSecondaryColor.value = colors.secondary
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
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <p v-if="mutationErrorMessage" class="text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
    <ProjectEditorFormLayout
      :color-validation-messages="colorValidationMessages"
      heading="Create project"
      :is-saving="isSaving"
      :name="dynamicName"
      :notes="dynamicNotes"
      :preview-badge-style="previewBadgeStyle as Record<string, string>"
      :preview-header-style="previewHeaderStyle as Record<string, string>"
      preview-notes-fallback="Notes can help you frame the project before the first session."
      :preview-surface-style="previewSurfaceStyle as Record<string, string>"
      :primary-color="dynamicPrimaryColor"
      :secondary-color="dynamicSecondaryColor"
      submit-label="Create project"
      @apply-palette="applyPalette"
      @cancel="leaveCreateWorkspace"
      @clear-error="mutationErrorMessage = ''"
      @save="saveProject"
      @update:name="dynamicName = $event"
      @update:notes="dynamicNotes = $event"
      @update:primary-color="dynamicPrimaryColor = $event"
      @update:secondary-color="dynamicSecondaryColor = $event"
    />
  </div>
</template>
