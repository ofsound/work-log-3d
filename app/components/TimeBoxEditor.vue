<script setup lang="ts">
import type { PropType } from 'vue'

import { doc } from 'firebase/firestore'

import ContainerCard from '~/components/ContainerCard.vue'

import { getProjectPickerOptionStyle } from '~/utils/project-color-styles'
import { addMinutesToDatetimeLocal } from '~/utils/minute-vertical-drag'
import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBox } from '~/utils/worklog-firebase'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  formatLocaleTime,
  formatSessionTimeHero,
  formatToDatetimeLocal,
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
  /** Sidebar / calendar side panel: no outer card border, shadow, or extra padding (aside already frames content). */
  embeddedInPanel: { type: Boolean, default: false },
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

const sessionTimeHero = computed(() => {
  if (!dynamicStartTime.value || !dynamicEndTime.value) {
    return null
  }
  return formatSessionTimeHero(new Date(dynamicStartTime.value), new Date(dynamicEndTime.value))
})

/** Normalize to `datetime-local` shape so inputs stay visually in sync when times change from duration/timer. */
const datetimeLocalStartModel = computed({
  get() {
    const raw = dynamicStartTime.value
    if (!raw) return ''
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
    if (!raw) return ''
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? raw : formatToDatetimeLocal(parsed)
  },
  set(value: string) {
    dynamicEndTime.value = value
  },
})

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

const applyCreateDefaults = (options?: { preserveNotes?: boolean }) => {
  dynamicStartTime.value = props.initialStartTime || props.startTimeFromTimer || ''
  dynamicEndTime.value = props.initialEndTime || props.endTimeFromTimer || ''
  if (!options?.preserveNotes) {
    dynamicNotes.value = props.initialNotes
  }
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

    if (props.resetAfterCreate) {
      void showOverlayToast({
        title: 'Session logged successfully',
        message: 'Your session was saved to the calendar.',
      })
      resetTimeBoxEditor()
    }
    emit('saved', createdId)
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
  () => [props.initialStartTime, props.initialEndTime, props.initialProject, props.initialTags],
  () => {
    if (!props.id) {
      applyCreateDefaults({ preserveNotes: true })
    }
  },
)

watch(
  () => props.initialNotes,
  (nextNotes) => {
    if (!props.id) {
      dynamicNotes.value = nextNotes
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

/** Keeps start ≤ end when dragging hero times (minute steps). */
function clampHeroDragTime(proposed: string, partner: string, role: 'start' | 'end'): string {
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

let durationDragBaselineMinutes = 0

const { dragActive: durationMinuteDragActive, onPointerDown: onDurationMinutePointerDown } =
  useMinuteVerticalDrag({
    blurSelector: '#timebox-duration-minutes',
    onSessionStart() {
      const raw = dynamicDuration.value
      const current = Number(typeof raw === 'string' ? raw.trim() || '0' : raw || 0)
      durationDragBaselineMinutes = Number.isFinite(current) ? current : 0
    },
    onDrag(deltaMinutes) {
      const next = Math.max(0, durationDragBaselineMinutes + deltaMinutes)
      dynamicDuration.value = next === 0 ? '' : next
      mutationErrorMessage.value = ''
    },
    onSessionEnd({ didDragBeyondThreshold }) {
      if (didDragBeyondThreshold) {
        mutationErrorMessage.value = ''
      }
    },
  })

let startTimeDragBaseline = ''

const { dragActive: startTimeMinuteDragActive, onPointerDown: onStartTimeMinutePointerDown } =
  useMinuteVerticalDrag({
    onSessionStart() {
      startTimeDragBaseline = dynamicStartTime.value
    },
    onDrag(deltaMinutes) {
      if (!startTimeDragBaseline) {
        return
      }

      const parsed = new Date(startTimeDragBaseline)

      if (Number.isNaN(parsed.getTime())) {
        return
      }

      const proposed = addMinutesToDatetimeLocal(startTimeDragBaseline, deltaMinutes)
      dynamicStartTime.value = dynamicEndTime.value
        ? clampHeroDragTime(proposed, dynamicEndTime.value, 'start')
        : proposed
      mutationErrorMessage.value = ''
    },
    onSessionEnd({ didDragBeyondThreshold }) {
      if (didDragBeyondThreshold) {
        mutationErrorMessage.value = ''
      }
    },
  })

let endTimeDragBaseline = ''

const { dragActive: endTimeMinuteDragActive, onPointerDown: onEndTimeMinutePointerDown } =
  useMinuteVerticalDrag({
    onSessionStart() {
      endTimeDragBaseline = dynamicEndTime.value
    },
    onDrag(deltaMinutes) {
      if (!endTimeDragBaseline) {
        return
      }

      const parsed = new Date(endTimeDragBaseline)

      if (Number.isNaN(parsed.getTime())) {
        return
      }

      const proposed = addMinutesToDatetimeLocal(endTimeDragBaseline, deltaMinutes)
      dynamicEndTime.value = dynamicStartTime.value
        ? clampHeroDragTime(proposed, dynamicStartTime.value, 'end')
        : proposed
      mutationErrorMessage.value = ''
    },
    onSessionEnd({ didDragBeyondThreshold }) {
      if (didDragBeyondThreshold) {
        mutationErrorMessage.value = ''
      }
    },
  })

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

const editorRootIs = computed(() => (props.embeddedInPanel ? 'div' : ContainerCard))

const editorRootBind = computed(() =>
  props.embeddedInPanel
    ? { class: 'flex min-h-0 min-w-0 flex-1 flex-col gap-0 grayscale-10' }
    : {
        padding: 'compact' as const,
        variant: 'gradient' as const,
        class:
          'flex min-w-0 flex-col gap-5 grayscale-10 [@container(min-width:44rem)]:rounded-md [@container(min-width:44rem)]:px-6 [@container(min-width:44rem)]:py-5',
      },
)
</script>

<template>
  <div
    ref="timeBoxEditorRef"
    class="[container-type:inline-size] w-full max-w-full min-w-0 font-data text-text"
    :class="embeddedInPanel ? 'flex h-full min-h-0 flex-col' : ''"
  >
    <component :is="editorRootIs" v-bind="editorRootBind">
      <div
        class="flex min-w-0 flex-col gap-5"
        :class="embeddedInPanel ? 'min-h-0 flex-1 overflow-x-hidden' : ''"
      >
        <div :class="embeddedInPanel ? 'px-5 pb-5' : ''">
          <section
            class="grid min-w-0 gap-4 [@container(min-width:38rem)]:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]"
            :class="embeddedInPanel ? 'grid-cols-[minmax(0,8rem)_minmax(0,1fr)]' : ''"
          >
            <AppField as="div" class="min-w-0 self-start" density="comfortable" label="Duration">
              <!-- Block wrapper: avoids a single flex row inheriting stretched height from the grid row. -->
              <div class="rounded-md border border-input-border bg-input px-3 py-3">
                <div class="flex min-w-0 items-end gap-2">
                  <div
                    class="flex min-w-0 flex-1 touch-none"
                    :class="
                      durationMinuteDragActive ? 'cursor-grabbing select-none' : 'cursor-ns-resize'
                    "
                    @pointerdown="onDurationMinutePointerDown"
                  >
                    <input
                      id="timebox-duration-minutes"
                      v-model="dynamicDuration"
                      inputmode="numeric"
                      class="w-full min-w-0 bg-transparent text-right text-4xl leading-none font-bold tabular-nums outline-none select-text"
                      @input="mutationErrorMessage = ''"
                    />
                  </div>
                  <span
                    class="inline-block -translate-y-1 pb-0.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                    >min</span
                  >
                </div>
              </div>
            </AppField>

            <div
              class="col-span-2 ml-0 flex min-w-0 flex-col gap-4 [@container(min-width:38rem)]:col-span-1 [@container(min-width:38rem)]:ml-8"
            >
              <div aria-live="polite" class="flex min-w-0 flex-col gap-3">
                <AppFieldLabel v-if="sessionTimeHero && !embeddedInPanel"
                  >Start & End</AppFieldLabel
                >
                <div
                  class="flex min-w-0 flex-col gap-1"
                  :class="
                    !sessionTimeHero
                      ? 'mt-[calc(1.25rem+0.75rem+0.75rem+4px)]'
                      : embeddedInPanel
                        ? 'mt-0 mb-4'
                        : 'mt-[calc(0.75rem+4px)]'
                  "
                >
                  <p
                    v-if="sessionTimeHero"
                    class="min-w-0 text-3xl leading-tight font-bold tracking-tight tabular-nums [@container(min-width:44rem)]:text-4xl [@container(min-width:44rem)]:leading-none"
                  >
                    <span
                      class="inline touch-none"
                      :class="
                        startTimeMinuteDragActive
                          ? 'cursor-grabbing select-none'
                          : 'cursor-ns-resize'
                      "
                      @pointerdown="onStartTimeMinutePointerDown"
                      >{{ formatLocaleTime(new Date(dynamicStartTime)) }}</span
                    ><span aria-hidden="true"> – </span
                    ><span
                      class="inline touch-none"
                      :class="
                        endTimeMinuteDragActive ? 'cursor-grabbing select-none' : 'cursor-ns-resize'
                      "
                      @pointerdown="onEndTimeMinutePointerDown"
                      >{{ formatLocaleTime(new Date(dynamicEndTime)) }}</span
                    >
                  </p>
                  <template v-else>
                    <!--
                    Placeholder line height only: the em dash never shows until `sessionTimeHero`
                    (v-if above) — if only one of start/end is set, a visible dash looked like a
                    broken hero. Keep `invisible` whenever we are not on the real hero branch.
                  -->
                    <p
                      class="min-w-0 text-3xl leading-tight font-bold tracking-tight text-text-muted tabular-nums [@container(min-width:44rem)]:text-4xl [@container(min-width:44rem)]:leading-none"
                    >
                      <span class="invisible" aria-hidden="true">—</span>
                    </p>
                  </template>
                  <p v-if="sessionTimeHero?.secondary" class="text-sm font-medium text-text-muted">
                    {{ sessionTimeHero.secondary }}
                  </p>
                </div>
              </div>

              <!--
              Intentionally hidden: these native datetime-local inputs stay mounted so
              start/end stay in sync with v-model, duration, and drag handlers on the hero.
              The large hero line is the visible control surface; do not delete this block
              thinking it is dead UI.
            -->
              <div class="hidden">
                <AppField class="min-w-0 shrink-0" density="compact">
                  <AppTextInput
                    v-model="datetimeLocalStartModel"
                    type="datetime-local"
                    aria-label="Start"
                    class="w-[200px] max-w-full text-sm"
                    density="compact"
                    @input="mutationErrorMessage = ''"
                  />
                </AppField>

                <AppField class="min-w-0 shrink-0" density="compact">
                  <AppTextInput
                    v-model="datetimeLocalEndModel"
                    type="datetime-local"
                    aria-label="End"
                    class="w-[200px] max-w-full text-sm"
                    density="compact"
                    @input="mutationErrorMessage = ''"
                  />
                </AppField>
              </div>
            </div>
          </section>

          <div
            class="min-w-0 border-t border-border-subtle pt-5"
            :class="
              hideTags
                ? ''
                : 'flex flex-col gap-6 [@container(min-width:38rem)]:grid [@container(min-width:38rem)]:grid-cols-[minmax(0,1fr)_minmax(0,25%)] [@container(min-width:38rem)]:items-start [@container(min-width:38rem)]:gap-x-6 [@container(min-width:38rem)]:gap-y-0'
            "
          >
            <section class="flex min-w-0 flex-col gap-3">
              <AppFieldLabel as="div">Project</AppFieldLabel>

              <div
                class="project-radio-group grid gap-2.5"
                :class="[
                  projectRadiosTwoColumns ? '[@container(min-width:52rem)]:grid-cols-2' : '',
                  !hideTags
                    ? '[@container(min-width:38rem)]:border-r [@container(min-width:38rem)]:border-border-subtle [@container(min-width:38rem)]:pr-6'
                    : '',
                ]"
              >
                <label
                  v-for="thisProject in sortedPickerProjects"
                  :key="thisProject.id"
                  class="flex min-w-0 cursor-pointer items-center gap-3 rounded-md border border-solid px-3 py-3 transition-[border-color,box-shadow,filter] duration-150 ease-out select-none"
                  :class="[
                    dynamicProject === thisProject.id
                      ? 'shadow-panel-selected hover:brightness-[1.02]'
                      : 'project-radio-option-muted shadow-control',
                  ]"
                  :style="
                    getProjectPickerOptionStyle(
                      thisProject.colors,
                      dynamicProject === thisProject.id,
                    )
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

              <ContainerCard
                v-if="hideTags"
                class="py-3 shadow-none"
                padding="compact"
                variant="muted"
              >
                <span v-if="showLegacyTagNotice" class="text-sm text-text-muted">
                  Existing tags on this session are preserved, but tag editing is hidden in
                  project-only mode.
                </span>
                <span v-else class="text-sm text-text-muted">
                  Tags are hidden in project-only mode. New sessions will save without tags.
                </span>
              </ContainerCard>
            </section>

            <section
              v-if="!hideTags"
              class="flex min-w-0 flex-col gap-3 border-t border-border-subtle pt-5 [@container(min-width:38rem)]:border-t-0 [@container(min-width:38rem)]:pt-0"
            >
              <AppFieldLabel as="div">Tags</AppFieldLabel>

              <div
                class="flex flex-wrap gap-2.5 [@container(min-width:38rem)]:flex-col [@container(min-width:38rem)]:flex-nowrap [@container(min-width:38rem)]:gap-2"
              >
                <AppToggleChip
                  v-for="thisTag in sortedAllTags"
                  :key="thisTag.id"
                  :selected="dynamicTags.includes(thisTag.id)"
                  class="[@container(min-width:38rem)]:w-full [@container(min-width:38rem)]:justify-start"
                >
                  <input
                    v-model="dynamicTags"
                    type="checkbox"
                    :value="thisTag.id"
                    class="shrink-0"
                    @change="mutationErrorMessage = ''"
                  />
                  <span>{{ thisTag.name }}</span>
                </AppToggleChip>
              </div>
            </section>
          </div>

          <div class="border-t border-border-subtle pt-5" :class="embeddedInPanel ? 'mt-5' : ''">
            <AppField class="min-w-0" density="comfortable" label="Notes">
              <AppTextarea
                v-model="dynamicNotes"
                class="min-h-24"
                rows="4"
                density="comfortable"
                placeholder="What happened during this session?"
                @input="mutationErrorMessage = ''"
              ></AppTextarea>
            </AppField>
          </div>

          <p v-if="mutationErrorMessage" class="text-sm text-danger">
            {{ mutationErrorMessage }}
          </p>
        </div>
      </div>

      <div
        :class="
          embeddedInPanel
            ? 'shrink-0 border-t border-border-subtle bg-surface-strong pt-4'
            : 'mt-1 pt-4'
        "
      >
        <div
          class="flex w-full min-w-0 flex-row items-stretch gap-3"
          :class="embeddedInPanel ? 'px-4' : ''"
        >
          <AppButton
            v-if="isEditingExistingTimeBox || props.showCreateCancel"
            class="min-w-0 flex-1"
            variant="secondary"
            @click="emit('toggleEditor')"
          >
            Cancel
          </AppButton>
          <AppButton
            v-if="isEditingExistingTimeBox"
            class="min-w-0 flex-1"
            variant="primary"
            @click="updateTimeBoxDocument"
          >
            Update
          </AppButton>
          <AppButton v-else class="min-w-0 flex-1" variant="primary" @click="createTimeBoxDocument">
            {{ createButtonLabel }}
          </AppButton>
        </div>
      </div>
    </component>
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
