<script setup lang="ts">
import type { PropType } from 'vue'

import ContainerCard from '~/components/ContainerCard.vue'

import { useTimeBoxEditorModel, type TimeBoxEditorProps } from '~/composables/useTimeBoxEditorModel'
import { useTimeBoxEditorMutations } from '~/composables/useTimeBoxEditorMutations'
import { getProjectPickerOptionStyle } from '~/utils/project-color-styles'
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
  /** Sidebar / calendar side panel: no outer card border, shadow, or extra padding (aside already frames content). */
  embeddedInPanel: { type: Boolean, default: false },
}) as TimeBoxEditorProps

const emit = defineEmits(['toggleEditor', 'saved'])

const timeBoxEditorRef = ref<HTMLElement | null>(null)
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
  isEditingExistingTimeBox,
  projectRadiosTwoColumns,
  sessionTimeHero,
  showLegacyTagNotice,
  sortedAllTags,
  sortedPickerProjects,
} = model
const { createTimeBoxDocument, mutationErrorMessage, updateTimeBoxDocument } = mutationState

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
                  <span class="min-w-0 text-base font-medium">{{ thisProject.name }}</span>
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
