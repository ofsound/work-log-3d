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

  const clearDurationTypingTimer = () => {
    clearTimeout(dynamicDurationTypingTimer.value)
    dynamicDurationTypingTimer.value = undefined
  }

  const allProjects = useCollection(projectsCollection)
  const allTags = useCollection(tagsCollection)

  const dynamicStartTime = ref('')
  const dynamicEndTime = ref('')
  const dynamicNotes = ref('')
  const dynamicProject = ref('')
  const dynamicTags = ref<string[]>([])
  const dynamicDuration = ref<string | number>('')

  /** Last notes value pushed to the active timer; its Firestore echo must not overwrite newer typing. */
  let lastSentDraftNotes: string | null = null

  const serializeEditorFields = (fields: {
    startTime: string
    endTime: string
    notes: string
    project: string
    tags: readonly string[]
  }) =>
    JSON.stringify([
      fields.startTime,
      fields.endTime,
      fields.notes,
      fields.project,
      [...fields.tags].sort(),
    ])

  const getCurrentEditorFields = () => ({
    startTime: dynamicStartTime.value,
    endTime: dynamicEndTime.value,
    notes: dynamicNotes.value,
    project: dynamicProject.value,
    tags: dynamicTags.value,
  })

  const pristineEditorFields = ref(serializeEditorFields(getCurrentEditorFields()))

  const markPristine = (overrides: { notes?: string } = {}) => {
    pristineEditorFields.value = serializeEditorFields({
      ...getCurrentEditorFields(),
      ...overrides,
    })
  }

  const isDirty = computed(
    () => serializeEditorFields(getCurrentEditorFields()) !== pristineEditorFields.value,
  )

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
    clearDurationTypingTimer()
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

  const applyCreateDefaults = () => {
    dynamicStartTime.value =
      options.props.initialStartTime || options.props.startTimeFromTimer || ''
    dynamicEndTime.value = options.props.initialEndTime || options.props.endTimeFromTimer || ''

    dynamicNotes.value = options.props.initialNotes || ''

    dynamicProject.value = options.props.initialProject || ''
    dynamicTags.value = [...options.props.initialTags]
    syncDynamicDurationFromTimes()
    markPristine({ notes: options.props.initialNotes || '' })
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
        markPristine()
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
    clearDurationTypingTimer()
    dynamicStartTime.value = ''
    dynamicEndTime.value = ''
    dynamicDuration.value = ''
    dynamicProject.value = ''
    dynamicNotes.value = ''
    dynamicTags.value = []
    markPristine()
    options.clearMutationError()
  }

  const clearDraftSyncTimer = () => {
    if (draftSyncTimer.value) {
      clearTimeout(draftSyncTimer.value)
      draftSyncTimer.value = undefined
    }
  }

  watch(
    () => [options.props.startTimeFromTimer, options.props.endTimeFromTimer] as const,
    ([start, end], [previousStart, previousEnd]) => {
      if (options.props.id) {
        return
      }

      if (start !== previousStart) {
        dynamicStartTime.value = start || options.props.initialStartTime || ''
      }

      // A fresh timer has no end yet. Clear the previous session's end even when
      // the timer's end prop was already empty before starting.
      if (start !== previousStart || end !== previousEnd) {
        dynamicEndTime.value = end || options.props.initialEndTime || ''
      }
      options.clearMutationError()
    },
  )

  // Parent draft echoes must update only their own fields, never reinitialize edited times.
  watch(
    () =>
      [
        options.props.initialStartTime,
        options.props.initialEndTime,
        options.props.initialProject,
        options.props.initialTags,
      ] as const,
    ([start, end, project, tags], [previousStart, previousEnd, previousProject, previousTags]) => {
      if (options.props.id) return

      if (start !== previousStart) {
        dynamicStartTime.value = start || options.props.startTimeFromTimer || ''
      }
      if (end !== previousEnd) {
        dynamicEndTime.value = end || options.props.endTimeFromTimer || ''
      }
      if (project !== previousProject) {
        dynamicProject.value = project || ''
      }
      if (JSON.stringify(tags) !== JSON.stringify(previousTags)) {
        dynamicTags.value = [...tags]
      }
    },
  )

  watch(
    () => options.props.initialNotes,
    (nextNotes) => {
      if (options.props.id) {
        return
      }

      const incomingNotes = nextNotes || ''

      if (draftSyncTimer.value !== undefined || incomingNotes === lastSentDraftNotes) {
        return
      }

      dynamicNotes.value = incomingNotes
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
      const draftNotes = dynamicNotes.value
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
        draftSyncTimer.value = undefined
        lastSentDraftNotes = draftNotes
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
      clearDurationTypingTimer()
      const durationFromTimes =
        dynamicStartTime.value && dynamicEndTime.value ? timeBoxDuration() : null
      if (dynamicDuration.value === (durationFromTimes || '')) {
        return
      }

      if (dynamicStartTime.value) {
        const tempDate = new Date(dynamicStartTime.value)
        tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
        dynamicEndTime.value = formatToDatetimeLocal(tempDate)
        return
      }

      const raw = dynamicDuration.value

      if (raw === '' || raw === null || raw === undefined) {
        return
      }

      dynamicDurationTypingTimer.value = setTimeout(() => {
        dynamicDurationTypingTimer.value = undefined
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
    clearDurationTypingTimer()
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
    isDirty,
    isEditingExistingTimeBox,
    resetTimeBoxEditor,
    sessionTimeHero,
    sortedAllTags,
    sortedPickerProjects,
  }
}
