<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'

import ChevronLeftIcon from '@/icons/ChevronLeftIcon.vue'
import CloseIcon from '@/icons/CloseIcon.vue'

import type { Project, TimeBox } from '~~/shared/worklog'

const props = defineProps({
  mode: {
    type: String as PropType<'scratchpad' | 'overview' | 'session' | 'create'>,
    required: true,
  },
  sessionId: { type: String, default: undefined },
  day: { type: Object as PropType<Date | null>, default: null },
  dateKey: { type: String, default: '' },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
  persistent: { type: Boolean, default: false },
  overlay: { type: Boolean, default: false },
  selectedSessionId: { type: String, default: '' },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  sessionsViewMode: {
    type: String as PropType<'search' | 'day' | 'week' | 'month' | 'year'>,
    default: 'search',
  },
})

const emit = defineEmits<{
  backToOverview: []
  close: []
  created: [sessionId: string]
  openSession: [sessionId: string]
  showOverview: []
  showScratchpad: []
}>()

const scratchpadPanelRef = ref<{ flushPendingChanges: () => Promise<void> } | null>(null)

const persistentPanelItems = computed(() => {
  const items = [
    { id: 'scratchpad', label: 'Scratchpad' },
    { id: 'overview', label: 'Overview' },
  ]

  if (props.mode === 'session' || props.mode === 'create') {
    items.push({
      id: 'session',
      label: props.mode === 'session' ? 'Session' : 'New Session',
    })
  }

  return items
})

const persistentPanelActiveId = computed(() => (props.mode === 'create' ? 'session' : props.mode))

const handleCreated = (sessionId: string) => {
  emit('created', sessionId)
}

const handlePersistentPanelSelect = (itemId: string) => {
  if (itemId === 'scratchpad') {
    emit('showScratchpad')
    return
  }

  if (itemId === 'overview') {
    emit('showOverview')
  }
}

const flushScratchpad = async () => {
  await scratchpadPanelRef.value?.flushPendingChanges()
}

const showOverlayOverviewSummary = computed(
  () => props.overlay && !props.persistent && props.mode === 'overview' && props.day != null,
)
const showOverlayHeader = computed(() => props.overlay && !props.persistent)
const showOverlaySessionHeader = computed(
  () => showOverlayHeader.value && props.mode === 'session' && Boolean(props.sessionId),
)
const panelUsesEdgeAlignedEditorScroll = computed(
  () => props.mode === 'session' || props.mode === 'create',
)
const panelBodyPaddingClass = computed(() => {
  if (panelUsesEdgeAlignedEditorScroll.value) {
    return showOverlaySessionHeader.value ? 'pb-4' : 'pt-4 pb-4'
  }

  return 'pt-4 pb-4'
})

const overlayOverviewSummaryTitle = computed(
  () =>
    props.day?.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) ?? '',
)
const overlaySessionDayTitle = computed(() => overlayOverviewSummaryTitle.value)
const showProjectCountInDaySummary = computed(
  () => props.sessionsViewMode === 'week' || props.sessionsViewMode === 'month',
)

defineExpose({
  flushScratchpad,
})
</script>

<template>
  <WorkspaceSidePanelFrame :body-padding-class="panelBodyPaddingClass" :overlay="props.overlay">
    <template #header>
      <div
        v-if="showOverlayHeader"
        class="flex shrink-0 items-center justify-between gap-3 px-3 pb-2"
        :class="props.overlay ? 'pt-2' : 'pt-3'"
      >
        <button
          v-if="showOverlaySessionHeader"
          type="button"
          class="inline-flex cursor-pointer items-center gap-1 rounded-md py-2 pr-3 pl-0 text-sm font-semibold transition"
          :class="
            props.overlay
              ? 'text-text-muted hover:bg-overlay-inverse hover:text-text'
              : 'text-text-subtle hover:bg-surface hover:text-text'
          "
          @click="emit('backToOverview')"
        >
          <ChevronLeftIcon />
          Back
        </button>
        <div v-else />

        <button
          type="button"
          class="cursor-pointer rounded-md p-2 text-text-subtle hover:text-text"
          :class="props.overlay ? 'hover:bg-overlay-inverse' : 'hover:bg-surface'"
          aria-label="Close"
          @click="emit('close')"
        >
          <CloseIcon />
        </button>
      </div>
      <div
        v-else
        class="flex shrink-0 items-center gap-3 px-3 py-3"
        :class="props.persistent ? 'justify-center' : 'justify-between'"
      >
        <div v-if="props.persistent" class="flex min-w-0 flex-wrap items-center gap-2">
          <AppSegmentedControl
            :active-id="persistentPanelActiveId"
            aria-label="Day sidebar sections"
            :items="persistentPanelItems"
            size="medium"
            @select="handlePersistentPanelSelect"
          />
        </div>

        <button
          v-if="!props.persistent"
          type="button"
          class="cursor-pointer rounded-md p-2 text-text-subtle hover:text-text"
          :class="props.overlay ? 'hover:bg-overlay-inverse' : 'hover:bg-surface'"
          aria-label="Close"
          @click="emit('close')"
        >
          <CloseIcon />
        </button>
      </div>
    </template>

    <template #subheader>
      <div v-if="showOverlaySessionHeader" class="-mt-1 px-4 pt-0 pb-3">
        <div class="text-lg font-bold tracking-tight">{{ overlaySessionDayTitle }}</div>
      </div>
      <div v-else-if="showOverlayOverviewSummary" class="-mt-1 px-4 pt-0 pb-3">
        <DaySummaryHeader
          metadata-top-spacing-class="mt-2 flex flex-wrap gap-2"
          :show-project-count="showProjectCountInDaySummary"
          summary-eyebrow=""
          :summary-title="overlayOverviewSummaryTitle"
          :time-boxes="props.timeBoxes"
        />
      </div>
    </template>

    <div
      v-if="props.persistent"
      v-show="props.mode === 'scratchpad'"
      class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4"
    >
      <DailyScratchpadPanel
        ref="scratchpadPanelRef"
        class="min-h-0 flex-1"
        :active="props.mode === 'scratchpad'"
        :date-key="props.dateKey"
      />
    </div>

    <DaySessionsOverviewPanel
      v-if="props.mode === 'overview' && props.day"
      class="px-4"
      :day="props.day"
      empty-message="No sessions on the selected day."
      :project-by-id="props.projectById"
      :project-name-by-id="props.projectNameById"
      :show-project-count="showProjectCountInDaySummary"
      :selected-session-id="props.selectedSessionId"
      :show-day-summary="!props.persistent && !showOverlayOverviewSummary"
      summary-eyebrow=""
      show-project-name
      :time-boxes="props.timeBoxes"
      use-project-card-styles
      @open-session="emit('openSession', $event)"
    />

    <div
      v-if="props.mode === 'session' && props.sessionId"
      class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <TimeBox
        :id="props.sessionId"
        embedded-in-panel
        :variant="props.sessionsViewMode === 'day' ? 'sessions-day' : undefined"
        flush-top
        @deleted="emit('close')"
      />
    </div>

    <div
      v-else-if="props.mode === 'create'"
      class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4"
    >
      <TimeBoxEditor
        class="min-h-0 flex-1"
        layout="thin"
        surface="panel"
        :initial-start-time="props.initialStartTime"
        :initial-end-time="props.initialEndTime"
        :reset-after-create="false"
        :show-create-cancel="true"
        create-button-label="Save Session"
        @saved="handleCreated"
        @toggle-editor="emit('close')"
      />
    </div>
  </WorkspaceSidePanelFrame>
</template>
