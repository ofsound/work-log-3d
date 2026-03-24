<script setup lang="ts">
import type { PropType } from 'vue'

import { doc } from 'firebase/firestore'

import { getProjectPickerOptionStyle } from '~/utils/project-color-styles'
import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  getWorklogErrorMessage,
  projectsForSessionPicker,
  sortNamedEntities,
} from '~~/shared/worklog'

const props = defineProps({
  id: { type: String, default: undefined },
  startTimeFromTimer: { type: String, default: undefined },
  endTimeFromTimer: { type: String, default: undefined },
  initialStartTime: { type: String, default: undefined },
  initialEndTime: { type: String, default: undefined },
  initialNotes: { type: String, default: '' },
  initialProject: { type: String, default: '' },
  initialTags: { type: Array as PropType<string[]>, default: () => [] },
  resetAfterCreate: { type: Boolean, default: true },
  showCreateCancel: { type: Boolean, default: false },
  createButtonLabel: { type: String, default: 'Log Session' },
})

const emit = defineEmits(['toggleEditor', 'saved'])

const repositories = useWorklogRepository()
const { confirm } = useConfirmDialog()
const { show: showOverlayToast } = useOverlayToast()
const { hideTags } = useUserSettings()
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const timeBoxEditorRef = ref<HTMLElement | null>(null)
const mutationErrorMessage = ref('')

const dynamicDurationTypingTimer = ref<ReturnType<typeof setTimeout>>()

const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const sortedPickerProjects = computed(() =>
  sortNamedEntities(
    projectsForSessionPicker(
      toProjects(allProjects.value as FirebaseProjectDocument[]),
      dynamicProject.value,
    ),
  ),
)

const sortedAllTags = computed(() => {
  return sortNamedEntities(toTags(allTags.value as FirebaseTagDocument[]))
})

const dynamicStartTime = ref('')
const dynamicEndTime = ref('')
const dynamicNotes = ref('')
const dynamicProject = ref('')
const dynamicTags = ref<string[]>([])

const dynamicDuration = ref<string | number>('')
const showLegacyTagNotice = computed(() => hideTags.value && dynamicTags.value.length > 0)

const projectRadiosTwoColumns = computed(() => sortedPickerProjects.value.length > 4)
const isEditingExistingTimeBox = computed(() => Boolean(props.id))

function timeBoxDuration() {
  const date1 = new Date(dynamicStartTime.value)
  const date2 = new Date(dynamicEndTime.value)

  const differenceInMilliseconds = date2.getTime() - date1.getTime()
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60)

  return differenceInMinutes
}

function syncDynamicDurationFromTimes() {
  if (!dynamicStartTime.value || !dynamicEndTime.value) {
    dynamicDuration.value = ''
    return
  }

  const durationMinutes = timeBoxDuration()
  if (!Number.isFinite(durationMinutes)) {
    dynamicDuration.value = ''
    return
  }
  // Empty string when 0 so the field stays blank after reset / same start+end.
  dynamicDuration.value = durationMinutes === 0 ? '' : durationMinutes
}

const applyCreateDefaults = () => {
  dynamicStartTime.value = props.initialStartTime || props.startTimeFromTimer || ''
  dynamicEndTime.value = props.initialEndTime || props.endTimeFromTimer || ''
  dynamicNotes.value = props.initialNotes
  dynamicProject.value = props.initialProject
  dynamicTags.value = [...props.initialTags]
  syncDynamicDurationFromTimes()
}

if (props.id) {
  const timeBoxDocumentSource = computed(() =>
    timeBoxesCollection.value ? doc(timeBoxesCollection.value, props.id) : null,
  )
  const docBinding = useDocument(timeBoxDocumentSource, {
    ssrKey: `time-box-editor-${props.id}`,
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
      mutationErrorMessage.value = ''
    },
    { immediate: true },
  )
} else {
  applyCreateDefaults()
}

const updateTimeBoxDocument = async () => {
  if (!props.id) return

  const confirmed = await confirm({
    title: 'Update this session?',
    message: 'Save your changes to this time box.',
    confirmLabel: 'Update',
    variant: 'primary',
  })

  if (confirmed) {
    try {
      mutationErrorMessage.value = ''
      await repositories.timeBoxes.update(props.id, getTimeBoxInput())
      emit('saved', props.id)
      emit('toggleEditor')
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
    }
  } else {
    mutationErrorMessage.value = ''
    emit('toggleEditor')
  }
}

const createTimeBoxDocument = async () => {
  try {
    mutationErrorMessage.value = ''
    const createdId = await repositories.timeBoxes.create(getTimeBoxInput())
    emit('saved', createdId)

    if (props.resetAfterCreate) {
      await showOverlayToast({
        title: 'Session logged successfully',
        message: 'Your session was saved to the calendar.',
      })
      resetTimeBoxEditor()
    }
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save the session.')
  }
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
  mutationErrorMessage.value = ''
}

watch(
  () => props.startTimeFromTimer,
  (newValue) => {
    if (props.id) return

    if (newValue) {
      dynamicStartTime.value = newValue
    } else {
      dynamicStartTime.value = props.initialStartTime || ''
    }
    mutationErrorMessage.value = ''
  },
)

watch(
  () => props.endTimeFromTimer,
  (newValue) => {
    if (props.id) return

    if (newValue) {
      dynamicEndTime.value = newValue
    } else {
      dynamicEndTime.value = props.initialEndTime || ''
    }
    mutationErrorMessage.value = ''
  },
)

watch(
  () => [
    props.initialStartTime,
    props.initialEndTime,
    props.initialNotes,
    props.initialProject,
    props.initialTags,
  ],
  () => {
    if (!props.id) {
      applyCreateDefaults()
    }
  },
)

watch(
  () => [dynamicStartTime.value, dynamicEndTime.value],
  () => {
    syncDynamicDurationFromTimes()
  },
)

function isDurationFieldEmpty(value: string | number): boolean {
  return value === '' || value === null || value === undefined
}

watch(
  () => dynamicDuration.value,
  () => {
    if (dynamicStartTime.value) {
      const tempDate = new Date(dynamicStartTime.value)
      tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
      dynamicEndTime.value = formatToDatetimeLocal(tempDate)
    } else {
      const raw = dynamicDuration.value
      if (isDurationFieldEmpty(raw)) {
        clearTimeout(dynamicDurationTypingTimer.value)
        dynamicDurationTypingTimer.value = undefined
        return
      }
      clearTimeout(dynamicDurationTypingTimer.value)
      dynamicDurationTypingTimer.value = setTimeout(() => {
        const now = new Date()
        const tempDate = new Date(
          now.setMinutes(now.getMinutes() - parseInt(String(dynamicDuration.value || 0))),
        )
        dynamicStartTime.value = formatToDatetimeLocal(tempDate)
        tempDate.setMinutes(tempDate.getMinutes() + Number(dynamicDuration.value || 0))
        dynamicEndTime.value = formatToDatetimeLocal(tempDate)
      }, 400)
    }
  },
)

function adjustDurationMinutes(delta: number) {
  mutationErrorMessage.value = ''
  const raw = dynamicDuration.value
  const current = Number(typeof raw === 'string' ? raw.trim() || '0' : raw || 0)
  const base = Number.isFinite(current) ? current : 0
  const next = Math.max(0, base + delta)
  dynamicDuration.value = next === 0 ? '' : next
}

const handleEscape = (event: { key: string }) => {
  if (event.key === 'Escape') {
    emit('toggleEditor')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  if (dynamicDurationTypingTimer.value) {
    clearTimeout(dynamicDurationTypingTimer.value)
  }
})
</script>

<template>
  <div
    ref="timeBoxEditorRef"
    class="[container-type:inline-size] w-full max-w-full min-w-0 font-data text-text"
  >
    <ContainerCard
      class="flex min-w-0 flex-col gap-5 grayscale-10 [@container(min-width:44rem)]:rounded-md [@container(min-width:44rem)]:px-6 [@container(min-width:44rem)]:py-5"
      padding="compact"
      variant="gradient"
    >
      <section
        class="grid min-w-0 gap-4 [@container(min-width:38rem)]:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]"
      >
        <label class="flex min-w-0 flex-col gap-3">
          <div class="text-sm font-semibold text-text">Duration</div>
          <div
            class="flex min-w-0 items-end gap-2 rounded-2xl border border-input-border bg-input px-3 py-3 [@container(min-width:38rem)]:h-full"
          >
            <input
              v-model="dynamicDuration"
              inputmode="numeric"
              class="min-w-0 flex-1 bg-transparent text-right text-4xl font-bold tabular-nums outline-none"
              @input="mutationErrorMessage = ''"
            />
            <span class="pb-1 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
              >min</span
            >
          </div>
          <div
            class="flex min-w-0 flex-nowrap items-center gap-0.5 [@container(min-width:38rem)]:gap-1"
            role="group"
            aria-label="Adjust duration in minutes"
          >
            <AppButton
              size="xs"
              variant="secondary"
              class="min-w-0 flex-1 [@container(min-width:38rem)]:px-1 [@container(min-width:38rem)]:text-xs"
              @click="adjustDurationMinutes(-10)"
            >
              -10
            </AppButton>
            <AppButton
              size="xs"
              variant="secondary"
              class="min-w-0 flex-1 [@container(min-width:38rem)]:px-1 [@container(min-width:38rem)]:text-xs"
              @click="adjustDurationMinutes(-5)"
            >
              -5
            </AppButton>
            <AppButton
              size="xs"
              variant="secondary"
              class="min-w-0 flex-1 [@container(min-width:38rem)]:px-1 [@container(min-width:38rem)]:text-xs"
              @click="adjustDurationMinutes(5)"
            >
              +5
            </AppButton>
            <AppButton
              size="xs"
              variant="secondary"
              class="min-w-0 flex-1 [@container(min-width:38rem)]:px-1 [@container(min-width:38rem)]:text-xs"
              @click="adjustDurationMinutes(10)"
            >
              +10
            </AppButton>
          </div>
        </label>

        <div class="ml-8 flex min-w-0 flex-wrap items-start gap-8">
          <label class="flex min-w-0 shrink-0 flex-col gap-3">
            <div class="text-sm font-semibold text-text">Start</div>
            <input
              v-model="dynamicStartTime"
              type="datetime-local"
              class="w-[220px] max-w-full min-w-0 rounded-2xl border border-input-border bg-input px-3 py-3 text-text"
              @input="mutationErrorMessage = ''"
            />
          </label>

          <label class="flex min-w-0 shrink-0 flex-col gap-3">
            <div class="text-sm font-semibold text-text">End</div>
            <input
              v-model="dynamicEndTime"
              type="datetime-local"
              class="w-[220px] max-w-full min-w-0 rounded-2xl border border-input-border bg-input px-3 py-3 text-text"
              @input="mutationErrorMessage = ''"
            />
          </label>
        </div>
      </section>

      <label class="flex min-w-0 flex-col gap-3">
        <div class="text-sm font-semibold text-text">Notes</div>
        <textarea
          v-model="dynamicNotes"
          class="min-h-24 w-full max-w-full min-w-0 rounded-2xl border border-input-border bg-input px-4 py-3 text-text"
          rows="4"
          placeholder="What happened during this session?"
          @input="mutationErrorMessage = ''"
        ></textarea>
      </label>

      <div
        class="border-t border-border-subtle pt-5"
        :class="
          hideTags
            ? ''
            : 'flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,25%)] md:items-start md:gap-x-6 md:gap-y-0'
        "
      >
        <section
          class="flex min-w-0 flex-col gap-3"
          :class="!hideTags ? 'md:border-r md:border-border-subtle md:pr-6' : ''"
        >
          <div class="text-sm font-semibold text-text">Project</div>

          <div
            class="project-radio-group grid gap-2.5"
            :class="projectRadiosTwoColumns ? '[@container(min-width:52rem)]:grid-cols-2' : ''"
          >
            <label
              v-for="thisProject in sortedPickerProjects"
              :key="thisProject.id"
              class="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-solid px-3 py-3 transition-[border-color,box-shadow,filter] duration-150 ease-out select-none"
              :class="[
                dynamicProject === thisProject.id
                  ? 'shadow-panel-selected hover:brightness-[1.02]'
                  : 'project-radio-option-muted shadow-control',
              ]"
              :style="
                getProjectPickerOptionStyle(thisProject.colors, dynamicProject === thisProject.id)
              "
            >
              <input
                v-model="dynamicProject"
                type="radio"
                :value="thisProject.id"
                name="projectSelection"
                class="shrink-0"
                @change="mutationErrorMessage = ''"
              />
              <span class="min-w-0 text-base font-semibold">{{ thisProject.name }}</span>
            </label>
          </div>

          <ContainerCard v-if="hideTags" class="py-3 shadow-none" padding="compact" variant="muted">
            <span v-if="showLegacyTagNotice" class="text-sm text-text-muted">
              Existing tags on this session are preserved, but tag editing is hidden in
              project-first mode.
            </span>
            <span v-else class="text-sm text-text-muted">
              Tags are hidden in project-first mode. New sessions will save without tags.
            </span>
          </ContainerCard>
        </section>

        <section
          v-if="!hideTags"
          class="flex min-w-0 flex-col gap-3 border-t border-border-subtle pt-5 md:border-t-0 md:pt-0"
        >
          <div class="text-sm font-semibold text-text">Tags</div>

          <div class="flex flex-wrap gap-2.5 md:flex-col md:flex-nowrap md:gap-2">
            <label
              v-for="thisTag in sortedAllTags"
              :key="thisTag.id"
              class="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition md:w-full md:justify-start"
              :class="
                dynamicTags.includes(thisTag.id)
                  ? 'border-link bg-link/10 text-link'
                  : 'border-border-subtle bg-surface-muted text-text hover:bg-surface'
              "
            >
              <input
                v-model="dynamicTags"
                type="checkbox"
                :value="thisTag.id"
                class="shrink-0"
                @change="mutationErrorMessage = ''"
              />
              <span>{{ thisTag.name }}</span>
            </label>
          </div>
        </section>
      </div>

      <p v-if="mutationErrorMessage" class="text-sm text-danger">
        {{ mutationErrorMessage }}
      </p>

      <div
        class="mt-1 flex w-full min-w-0 flex-col gap-3 pt-4 [@container(min-width:30rem)]:flex-row [@container(min-width:30rem)]:items-stretch"
      >
        <AppButton
          v-if="isEditingExistingTimeBox || props.showCreateCancel"
          block
          class="shrink-0 [@container(min-width:30rem)]:w-auto"
          variant="secondary"
          @click="emit('toggleEditor')"
        >
          Cancel
        </AppButton>
        <AppButton
          v-if="isEditingExistingTimeBox"
          block
          class="min-w-0 [@container(min-width:30rem)]:flex-1"
          variant="primary"
          @click="updateTimeBoxDocument"
        >
          Update
        </AppButton>
        <AppButton
          v-else
          block
          class="min-w-0 [@container(min-width:30rem)]:flex-1"
          variant="primary"
          @click="createTimeBoxDocument"
        >
          {{ createButtonLabel }}
        </AppButton>
      </div>
    </ContainerCard>
  </div>
</template>

<style scoped>
.project-radio-option-muted {
  background-image: linear-gradient(135deg, var(--project-picker-from), var(--project-picker-to));
  border-color: var(--project-picker-border);
}

.project-radio-option-muted:hover {
  background-image: linear-gradient(
    135deg,
    var(--project-picker-from-hover),
    var(--project-picker-to-hover)
  );
  border-color: var(--project-picker-border-hover);
}
</style>
