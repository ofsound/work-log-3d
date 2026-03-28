import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { doc } from 'firebase/firestore'
import { useCollection, useDocument } from 'vuefire'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useTimerService } from '~/composables/useTimerService'
import { useUserSettings } from '~/composables/useUserSettings'
import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import { addMinutesToDatetimeLocal } from '~/utils/minute-vertical-drag'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  formatSessionTimeHero,
  formatToDatetimeLocal,
  projectsForSessionPicker,
  sortNamedEntities,
} from '~~/shared/worklog'

export type TimeBoxEditorSurface = 'card' | 'panel'
export type TimeBoxEditorLayout = 'regular' | 'thin'

export interface TimeBoxEditorProps {
  id?: string
  startTimeFromTimer?: string
  endTimeFromTimer?: string
  initialStartTime?: string
  initialEndTime?: string
  initialNotes?: string
  initialProject?: string
  initialTags: string[]
  resetAfterCreate: boolean
  showCreateCancel: boolean
  createButtonLabel: string
  surface: TimeBoxEditorSurface
  layout: TimeBoxEditorLayout
}

export interface UseTimeBoxEditorModelOptions {
  clearMutationError: () => void
  props: TimeBoxEditorProps
}

export function useTimeBoxEditorModel(options: UseTimeBoxEditorModelOptions) {
  const { hideTags } = useUserSettings()
  const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()
  const { setDraftContext, timerState } = useTimerService()

  const dynamicDurationTypingTimer = ref<ReturnType<typeof setTimeout>>()
  const draftSyncTimer = ref<ReturnType<typeof setTimeout>>()

  const allProjects = useCollection(projectsCollection)
  const allTags = useCollection(tagsCollection)

  const dynamicStartTime = ref('')
  const dynamicEndTime = ref('')
  const dynamicNotes = ref('')
  const dynamicProject = ref('')
  const dynamicTags = ref<string[]>([])
  const dynamicDuration = ref<string | number>('')

  const sortedPickerProjects = computed(() =>
    sortNamedEntities(
      projectsForSessionPicker(
        toProjects(allProjects.value as FirebaseProjectDocument[]),
        dynamicProject.value,
      ),
    ),
  )
  const sortedAllTags = computed(() =>
    sortNamedEntities(toTags(allTags.value as FirebaseTagDocument[])),
  )
  const showLegacyTagNotice = computed(() => hideTags.value && dynamicTags.value.length > 0)
  const projectRadiosTwoColumns = computed(() => sortedPickerProjects.value.length > 4)
  const isEditingExistingTimeBox = computed(() => Boolean(options.props.id))
  const sessionTimeHero = computed(() => {
    if (!dynamicStartTime.value || !dynamicEndTime.value) {
      return null
    }

    return formatSessionTimeHero(new Date(dynamicStartTime.value), new Date(dynamicEndTime.value))
  })

  const datetimeLocalStartModel = computed({
    get() {
      const raw = dynamicStartTime.value

      if (!raw) {
        return ''
      }

      const parsed = new Date(raw)
      return Number.isNaN(parsed.getTime()) ? raw : formatToDatetimeLocal(parsed)
    },
    set(value: string) {
      dynamicStartTime.value = value
    },
  })

  const datetimeLocalEndModel = computed({
    get() {
      const raw = dynamicEndTime.value

      if (!raw) {
        return ''
      }

      const parsed = new Date(raw)
      return Number.isNaN(parsed.getTime()) ? raw : formatToDatetimeLocal(parsed)
    },
    set(value: string) {
      dynamicEndTime.value = value
    },
  })

  const timeBoxDuration = () => {
    const date1 = new Date(dynamicStartTime.value)
    const date2 = new Date(dynamicEndTime.value)

    return (date2.getTime() - date1.getTime()) / (1000 * 60)
  }

  const syncDynamicDurationFromTimes = () => {
    if (!dynamicStartTime.value || !dynamicEndTime.value) {
      dynamicDuration.value = ''
      return
    }

    const durationMinutes = timeBoxDuration()

    if (!Number.isFinite(durationMinutes)) {
      dynamicDuration.value = ''
      return
    }

    dynamicDuration.value = durationMinutes === 0 ? '' : durationMinutes
  }

  const applyCreateDefaults = (applyOptions?: { preserveNotes?: boolean }) => {
    dynamicStartTime.value =
      options.props.initialStartTime || options.props.startTimeFromTimer || ''
    dynamicEndTime.value = options.props.initialEndTime || options.props.endTimeFromTimer || ''

    if (!applyOptions?.preserveNotes) {
      dynamicNotes.value = options.props.initialNotes || ''
    }

    dynamicProject.value = options.props.initialProject || ''
    dynamicTags.value = [...options.props.initialTags]
    syncDynamicDurationFromTimes()
  }

  if (options.props.id) {
    const timeBoxDocumentSource = computed(() =>
      timeBoxesCollection.value ? doc(timeBoxesCollection.value, options.props.id!) : null,
    )
    const docBinding = useDocument(timeBoxDocumentSource, {
      ssrKey: `time-box-editor-${options.props.id}`,
    })

    watch(
      () => docBinding.data.value,
      (value) => {
        if (!value) {
          return
        }

        const timeBox = toTimeBox(value as FirebaseTimeBoxDocument)
        dynamicNotes.value = timeBox.notes
        dynamicStartTime.value = timeBox.startTime ? formatToDatetimeLocal(timeBox.startTime) : ''
        dynamicEndTime.value = timeBox.endTime ? formatToDatetimeLocal(timeBox.endTime) : ''
        dynamicProject.value = timeBox.project
        dynamicTags.value = timeBox.tags
        syncDynamicDurationFromTimes()
        options.clearMutationError()
      },
      { immediate: true },
    )
  } else {
    applyCreateDefaults()
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
    options.clearMutationError()
  }

  const clearDraftSyncTimer = () => {
    if (draftSyncTimer.value) {
      clearTimeout(draftSyncTimer.value)
      draftSyncTimer.value = undefined
    }
  }

  watch(
    () => options.props.startTimeFromTimer,
    (newValue) => {
      if (options.props.id) {
        return
      }

      dynamicStartTime.value = newValue || options.props.initialStartTime || ''
      options.clearMutationError()
    },
  )

  watch(
    () => options.props.endTimeFromTimer,
    (newValue) => {
      if (options.props.id) {
        return
      }

      dynamicEndTime.value = newValue || options.props.initialEndTime || ''
      options.clearMutationError()
    },
  )

  watch(
    () => [
      options.props.initialStartTime,
      options.props.initialEndTime,
      options.props.initialProject,
      options.props.initialTags,
    ],
    () => {
      if (!options.props.id) {
        applyCreateDefaults({ preserveNotes: true })
      }
    },
  )

  watch(
    () => options.props.initialNotes,
    (nextNotes) => {
      if (!options.props.id) {
        dynamicNotes.value = nextNotes || ''
      }
    },
  )

  watch(
    () => [dynamicStartTime.value, dynamicEndTime.value],
    () => {
      syncDynamicDurationFromTimes()
    },
  )

  watch(
    () => [
      isEditingExistingTimeBox.value,
      dynamicProject.value,
      dynamicNotes.value,
      dynamicTags.value.join('|'),
      timerState.value.status,
    ],
    () => {
      if (isEditingExistingTimeBox.value || timerState.value.status === 'idle') {
        clearDraftSyncTimer()
        return
      }

      const project = dynamicProject.value.trim()
      const draftNotes = dynamicNotes.value.trim()
      const tags = [...new Set(dynamicTags.value.map((tag) => tag.trim()).filter(Boolean))]

      if (
        timerState.value.project === project &&
        timerState.value.draftNotes === draftNotes &&
        JSON.stringify(timerState.value.tags) === JSON.stringify(tags)
      ) {
        clearDraftSyncTimer()
        return
      }

      clearDraftSyncTimer()
      draftSyncTimer.value = setTimeout(() => {
        void setDraftContext({
          project,
          tags,
          draftNotes,
        })
      }, 250)
    },
    { immediate: true },
  )

  watch(
    () => dynamicDuration.value,
    () => {
      if (dynamicStartTime.value) {
        const tempDate = new Date(dynamicStartTime.value)
        tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
        dynamicEndTime.value = formatToDatetimeLocal(tempDate)
        return
      }

      const raw = dynamicDuration.value

      if (raw === '' || raw === null || raw === undefined) {
        clearTimeout(dynamicDurationTypingTimer.value)
        dynamicDurationTypingTimer.value = undefined
        return
      }

      clearTimeout(dynamicDurationTypingTimer.value)
      dynamicDurationTypingTimer.value = setTimeout(() => {
        const now = new Date()
        const tempDate = new Date(
          now.setMinutes(now.getMinutes() - parseInt(String(dynamicDuration.value || 0), 10)),
        )
        dynamicStartTime.value = formatToDatetimeLocal(tempDate)
        tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
        dynamicEndTime.value = formatToDatetimeLocal(tempDate)
      }, 400)
    },
  )

  onBeforeUnmount(() => {
    clearDraftSyncTimer()
  })

  const clampHeroDragTime = (proposed: string, partner: string, role: 'start' | 'end') => {
    const proposedMs = new Date(proposed).getTime()
    const partnerMs = new Date(partner).getTime()

    if (Number.isNaN(proposedMs) || !partner || Number.isNaN(partnerMs)) {
      return proposed
    }

    if (role === 'start' && proposedMs > partnerMs) {
      return formatToDatetimeLocal(new Date(partnerMs))
    }

    if (role === 'end' && proposedMs < partnerMs) {
      return formatToDatetimeLocal(new Date(partnerMs))
    }

    return proposed
  }

  return {
    addMinutesToDatetimeLocal,
    applyCreateDefaults,
    clampHeroDragTime,
    datetimeLocalEndModel,
    datetimeLocalStartModel,
    dynamicDuration,
    dynamicDurationTypingTimer,
    dynamicEndTime,
    dynamicNotes,
    dynamicProject,
    dynamicStartTime,
    dynamicTags,
    getTimeBoxInput,
    hideTags,
    isEditingExistingTimeBox,
    projectRadiosTwoColumns,
    resetTimeBoxEditor,
    sessionTimeHero,
    showLegacyTagNotice,
    sortedAllTags,
    sortedPickerProjects,
  }
}
