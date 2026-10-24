<script setup lang="ts">
import { useId, type PropType } from 'vue'

import ContainerCard from '~/components/ContainerCard.vue'
import ProjectPicker from '~/components/ProjectPicker.vue'

import {
  useTimeBoxEditorModel,
  type TimeBoxEditorLayout,
  type TimeBoxEditorProps,
  type TimeBoxEditorSurface,
} from '~/composables/useTimeBoxEditorModel'
import { useTimeBoxEditorMutations } from '~/composables/useTimeBoxEditorMutations'
import { formatLocaleTime } from '~~/shared/worklog'

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
  surface: { type: String as PropType<TimeBoxEditorSurface>, default: 'card' },
  layout: { type: String as PropType<TimeBoxEditorLayout>, default: 'regular' },
}) as TimeBoxEditorProps

const emit = defineEmits(['toggleEditor', 'saved'])

const timeBoxEditorRef = ref<HTMLElement | null>(null)
const durationInputId = `timebox-duration-${useId()}`
const mutationState = useTimeBoxEditorMutations({
  emit,
  getTimeBoxInput: () => model.getTimeBoxInput(),
  props,
  resetTimeBoxEditor: () => model.resetTimeBoxEditor(),
})
const model = useTimeBoxEditorModel({
  clearMutationError: mutationState.clearMutationError,
  props,
})

const {
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
  hideTags,
  isDirty,
  isEditingExistingTimeBox,
  sessionTimeHero,
  sortedAllTags,
  sortedPickerProjects,
} = model
const { createTimeBoxDocument, isSaving, mutationErrorMessage, updateTimeBoxDocument } =
  mutationState

let durationDragBaselineMinutes = 0

const { dragActive: durationMinuteDragActive, onPointerDown: onDurationMinutePointerDown } =
  useMinuteVerticalDrag({
    blurSelector: `#${durationInputId}`,
    onSessionStart() {
      const raw = dynamicDuration.value
      const current = Number(typeof raw === 'string' ? raw.trim() || '0' : raw || 0)
      durationDragBaselineMinutes = Number.isFinite(current) ? current : 0
    },
    onDrag(deltaMinutes) {
      const next = Math.max(0, durationDragBaselineMinutes + deltaMinutes)
      dynamicDuration.value = next === 0 ? '' : next
      mutationState.clearMutationError()
    },
    onSessionEnd({ didDragBeyondThreshold }) {
      if (didDragBeyondThreshold) {
        mutationState.clearMutationError()
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
      mutationState.clearMutationError()
    },
    onSessionEnd({ didDragBeyondThreshold }) {
      if (didDragBeyondThreshold) {
        mutationState.clearMutationError()
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
      mutationState.clearMutationError()
    },
    onSessionEnd({ didDragBeyondThreshold }) {
      if (didDragBeyondThreshold) {
        mutationState.clearMutationError()
      }
    },
  })

const { confirm, state: confirmDialogState } = useConfirmDialog()

const canCloseEditor = computed(() => isEditingExistingTimeBox.value || props.showCreateCancel)

const isEditableTarget = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))

/**
 * Registered in the capture phase so it runs before page-level Escape handlers (which close the
 * surrounding panel); `preventDefault()` tells those handlers the key was already handled.
 */
const handleEscape = async (event: KeyboardEvent) => {
  if (
    event.key !== 'Escape' ||
    event.defaultPrevented ||
    !canCloseEditor.value ||
    confirmDialogState.value.open
  ) {
    return
  }

  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('dialog[open], [role="dialog"]')) return
  const targetEditor = target?.closest('[data-timebox-editor]')
  if (targetEditor) {
    if (targetEditor !== timeBoxEditorRef.value) return
  } else {
    // Outside an editor, dismiss the most recently rendered dismissible editor.
    const editors = document.querySelectorAll('[data-timebox-editor-dismissible]')
    if (editors[editors.length - 1] !== timeBoxEditorRef.value) return
  }

  event.preventDefault()

  if (isEditableTarget(event.target)) {
    event.target.blur()
    return
  }

  if (isDirty.value) {
    const discard = await confirm({
      title: 'Discard changes?',
      message: 'Your edits to this session will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      variant: 'danger',
    })

    if (!discard) {
      return
    }
  }

  emit('toggleEditor')
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape, { capture: true })
  if (dynamicDurationTypingTimer.value) {
    clearTimeout(dynamicDurationTypingTimer.value)
  }
})

const isPanelSurface = computed(() => props.surface === 'panel')
const isThinLayout = computed(() => props.layout === 'thin')

const editorRootIs = computed(() => (isPanelSurface.value ? 'div' : ContainerCard))

const editorRootBind = computed(() =>
  isPanelSurface.value
    ? { class: 'flex min-h-0 min-w-0 flex-1 flex-col gap-0 grayscale-10' }
    : isThinLayout.value
      ? {
          padding: 'compact' as const,
          variant: 'gradient' as const,
          class: 'flex min-w-0 flex-col gap-4 grayscale-10',
        }
      : {
          padding: 'default' as const,
          variant: 'gradient' as const,
          class: 'flex min-w-0 flex-col gap-5 grayscale-10',
        },
)

const primarySectionClass = computed(() =>
  isThinLayout.value
    ? 'grid min-w-0 grid-cols-[9rem_minmax(0,1fr)] items-start gap-x-8 gap-y-4'
    : 'flex min-w-0 flex-col gap-5 [@container(min-width:38rem)]:grid [@container(min-width:38rem)]:grid-cols-[9rem_minmax(0,1fr)] [@container(min-width:38rem)]:items-start [@container(min-width:38rem)]:gap-x-12',
)

const timeControlClass =
  'flex h-16 items-center rounded-md border border-input-border bg-input px-3 py-3'
const timeValueClass = 'text-4xl leading-none font-bold tracking-tight tabular-nums'

const projectTagsSectionClass = computed(() => {
  if (hideTags.value) {
    return isThinLayout.value ? 'pt-4' : 'pt-5'
  }

  return [
    'flex flex-col [@container(min-width:38rem)]:grid [@container(min-width:38rem)]:grid-cols-[minmax(0,1fr)_minmax(0,25%)] [@container(min-width:38rem)]:items-start [@container(min-width:38rem)]:gap-y-0',
    isThinLayout.value
      ? 'gap-4 pt-4 [@container(min-width:38rem)]:gap-x-5'
      : 'gap-6 pt-5 [@container(min-width:38rem)]:gap-x-6',
  ].join(' ')
})

const tagsSectionClass = computed(() =>
  [
    'flex min-w-0 flex-col border-t border-border-subtle [@container(min-width:38rem)]:border-t-0 [@container(min-width:38rem)]:pt-0',
    isThinLayout.value ? 'gap-2.5 pt-4' : 'gap-3 pt-5',
  ].join(' '),
)

const tagsListClass = computed(() =>
  [
    'flex flex-wrap [@container(min-width:38rem)]:flex-col [@container(min-width:38rem)]:flex-nowrap [@container(min-width:38rem)]:gap-2',
    isThinLayout.value ? 'gap-2' : 'gap-2.5',
  ].join(' '),
)
</script>

<template>
  <div
    ref="timeBoxEditorRef"
    data-timebox-editor
    :data-timebox-editor-dismissible="canCloseEditor ? '' : undefined"
    class="[container-type:inline-size] w-full max-w-full min-w-0 font-data text-text"
    :class="isPanelSurface ? 'flex h-full min-h-0 flex-col' : ''"
  >
    <component :is="editorRootIs" v-bind="editorRootBind">
      <div
        class="flex min-w-0 flex-col"
        :class="[
          isThinLayout ? 'gap-4' : 'gap-5',
          isPanelSurface ? 'min-h-0 flex-1 overflow-x-hidden' : '',
        ]"
      >
        <div :class="isPanelSurface ? 'px-5 pb-5' : ''">
          <section data-testid="timebox-editor-primary-section" :class="primarySectionClass">
            <AppField
              as="div"
              class="w-36 min-w-0 self-start"
              density="comfortable"
              label="Duration"
            >
              <div :class="timeControlClass">
                <div class="flex w-full min-w-0 items-end gap-2">
                  <div
                    class="flex min-w-0 flex-1 touch-none"
                    :class="
                      durationMinuteDragActive ? 'cursor-grabbing select-none' : 'cursor-ns-resize'
                    "
                    @pointerdown="onDurationMinutePointerDown"
                  >
                    <input
                      :id="durationInputId"
                      v-model="dynamicDuration"
                      inputmode="numeric"
                      class="block h-9 w-full min-w-0 bg-transparent p-0 text-right outline-none select-text"
                      :class="timeValueClass"
                      @input="mutationErrorMessage = ''"
                    />
                  </div>
                  <span
                    class="inline-block shrink-0 -translate-y-1 pb-0.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                    >min</span
                  >
                </div>
              </div>
            </AppField>

            <div class="flex min-w-0 flex-col">
              <div aria-live="polite" class="flex min-w-0 flex-col gap-3">
                <AppFieldLabel v-if="sessionTimeHero && !isPanelSurface">Start & End</AppFieldLabel>
                <div class="flex min-w-0 flex-col gap-1">
                  <p
                    v-if="sessionTimeHero"
                    class="w-fit max-w-full min-w-0 gap-2"
                    :class="[timeControlClass, timeValueClass]"
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
                    <p class="min-w-0 text-text-muted" :class="timeValueClass">
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

          <!-- Width refinement only: at ~38rem, project and tag controls can split into side-by-side columns. -->
          <div
            data-testid="timebox-editor-project-tags-section"
            class="min-w-0 border-t border-border-subtle"
            :class="[projectTagsSectionClass, isPanelSurface ? 'mt-5' : 'max-sm:mt-4 md:mt-5']"
          >
            <section class="flex min-w-0 flex-col" :class="isThinLayout ? 'gap-2.5' : 'gap-3'">
              <ProjectPicker
                v-model="dynamicProject"
                :projects="sortedPickerProjects"
                @update:model-value="mutationErrorMessage = ''"
              />
            </section>

            <section
              v-if="!hideTags"
              data-testid="timebox-editor-tags-section"
              :class="tagsSectionClass"
            >
              <AppFieldLabel as="div">Tags</AppFieldLabel>

              <div :class="tagsListClass">
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

          <div
            class="border-t border-border-subtle"
            :class="[isThinLayout ? 'pt-4' : 'pt-5', isPanelSurface ? 'mt-5' : 'md:mt-5']"
          >
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
          isPanelSurface
            ? 'shrink-0 border-t border-border-subtle bg-surface-strong pt-4'
            : isThinLayout
              ? 'pt-3'
              : 'mt-1 pt-4'
        "
      >
        <div
          class="flex w-full min-w-0 flex-row items-stretch gap-3"
          :class="isPanelSurface ? 'px-4' : ''"
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
            :disabled="isSaving"
            :aria-busy="isSaving"
            @click="updateTimeBoxDocument"
          >
            {{ isSaving ? 'Saving…' : 'Update' }}
          </AppButton>
          <AppButton
            v-else
            class="min-w-0 flex-1"
            variant="primary"
            :disabled="isSaving"
            :aria-busy="isSaving"
            @click="createTimeBoxDocument"
          >
            {{ isSaving ? 'Saving…' : createButtonLabel }}
          </AppButton>
        </div>
      </div>
    </component>
  </div>
</template>
