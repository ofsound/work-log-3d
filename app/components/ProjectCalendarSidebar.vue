<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

import type { Project, TimeBox } from '~~/shared/worklog'

const props = defineProps({
  day: { type: Date, required: true },
  mode: { type: String as PropType<'day' | 'session'>, required: true },
  overlay: { type: Boolean, default: false },
  project: { type: Object as PropType<Project | null>, default: null },
  selectedSessionId: { type: String, default: '' },
  sessionId: { type: String, default: '' },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
})

const emit = defineEmits<{
  backToDay: []
  close: []
  openSession: [sessionId: string]
}>()

const dayTitle = computed(() =>
  props.day.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
)

const projectById = computed(() =>
  props.project ? ({ [props.project.id]: props.project } as Record<string, Project>) : {},
)
</script>

<template>
  <ContainerCard
    as="aside"
    class="flex h-full w-full min-w-0 shrink-0 flex-col p-0"
    :class="
      overlay
        ? ''
        : 'max-w-108 rounded-none border-y-0 border-r-0 border-l border-border bg-surface-strong'
    "
    padding="compact"
    :variant="overlay ? 'overlay' : 'subtle'"
  >
    <div
      class="flex shrink-0 items-center justify-between gap-3 px-3 py-3"
      :class="overlay ? 'border-b border-white/12 bg-white/10' : 'border-b border-border'"
    >
      <button
        v-if="mode === 'session'"
        type="button"
        class="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition"
        :class="
          overlay
            ? 'text-text-muted hover:bg-white/16 hover:text-text'
            : 'text-text-subtle hover:bg-surface hover:text-text'
        "
        @click="emit('backToDay')"
      >
        Back
      </button>
      <div v-else />

      <button
        type="button"
        class="cursor-pointer rounded-md p-2 text-text-subtle hover:text-text"
        :class="overlay ? 'hover:bg-white/16' : 'hover:bg-surface'"
        aria-label="Close"
        @click="emit('close')"
      >
        <CloseIcon />
      </button>
    </div>

    <div class="min-h-0 min-w-0 flex-1 px-4 pt-4 pb-4">
      <div
        v-if="mode === 'session' && sessionId"
        class="h-full min-w-0 overflow-y-auto overscroll-contain pr-1"
      >
        <div class="pb-3">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Session</div>
          <div class="mt-1 text-lg font-bold tracking-tight">{{ dayTitle }}</div>
        </div>
        <TimeBox :id="sessionId" :opaque-surface="overlay" flush-top @deleted="emit('close')" />
      </div>

      <div v-else class="h-full min-w-0 overflow-y-auto overscroll-contain pr-1">
        <DaySessionsOverviewPanel
          :day="day"
          empty-message="This project has no sessions on the selected day."
          :project-by-id="projectById"
          :selected-session-id="selectedSessionId"
          :time-boxes="timeBoxes"
          :use-project-card-styles="Boolean(project)"
          @open-session="emit('openSession', $event)"
        />
      </div>
    </div>
  </ContainerCard>
</template>
