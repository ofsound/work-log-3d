<script setup lang="ts">
import type { PropType } from 'vue'

import type { TimeBox } from '~~/shared/worklog'

const props = defineProps({
  mode: { type: String as PropType<'day' | 'session' | 'create'>, required: true },
  day: { type: Date, default: undefined },
  sessionId: { type: String, default: undefined },
  dayTimeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
})

const emit = defineEmits(['close', 'openSession', 'createSession', 'created'])

const dayTitle = computed(
  () =>
    props.day?.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) ?? '',
)

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled Project'

const formatTimeRange = (timeBox: TimeBox) => {
  if (!timeBox.startTime || !timeBox.endTime) {
    return ''
  }

  return `${timeBox.startTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${timeBox.endTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

const handleCreated = (sessionId: string) => {
  emit('created', sessionId)
}
</script>

<template>
  <aside
    class="flex h-full w-full max-w-108 shrink-0 flex-col border-l border-border bg-surface-strong shadow-panel"
  >
    <div class="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
      <div class="min-w-0 flex-1">
        <div v-if="mode === 'day'" class="text-lg font-bold">{{ dayTitle }}</div>
        <div v-else-if="mode === 'session'" class="text-lg font-bold">Session</div>
        <div v-else class="text-lg font-bold">New Session</div>
        <div class="text-sm text-text-subtle">
          <span v-if="mode === 'day'">{{ dayTimeBoxes.length }} scheduled</span>
          <span v-else-if="mode === 'create'">Prefilled from the calendar selection</span>
          <span v-else>Edit without losing calendar context</span>
        </div>
      </div>
      <button
        class="cursor-pointer rounded-md border border-button-secondary-border px-2 py-1 text-sm text-button-secondary-text hover:bg-button-secondary-hover"
        @click="emit('close')"
      >
        Close
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto px-4 py-4">
      <div v-if="mode === 'day'" class="flex flex-col gap-4">
        <button
          class="cursor-pointer rounded-md bg-button-primary px-3 py-2 text-sm font-semibold text-button-primary-text shadow-button-primary hover:bg-button-primary-hover"
          @click="emit('createSession')"
        >
          New Session
        </button>

        <div
          v-if="dayTimeBoxes.length === 0"
          class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-subtle"
        >
          No sessions on this day yet.
        </div>

        <button
          v-for="timeBox in dayTimeBoxes"
          :key="timeBox.id"
          class="cursor-pointer rounded-lg border border-border-subtle bg-panel-session px-4 py-3 text-left shadow-panel hover:border-border hover:bg-surface"
          @click="emit('openSession', timeBox.id)"
        >
          <div class="text-xs font-semibold tracking-[0.2em] text-text-subtle uppercase">
            {{ formatTimeRange(timeBox) }}
          </div>
          <div class="mt-1 text-sm font-semibold">{{ getProjectName(timeBox.project) }}</div>
          <div class="mt-1 line-clamp-3 text-sm text-text-muted">
            {{ timeBox.notes }}
          </div>
        </button>
      </div>

      <div v-else-if="mode === 'session' && sessionId">
        <TimeBox :id="sessionId" />
      </div>

      <div v-else class="pb-4">
        <TimeBoxEditor
          :initial-start-time="initialStartTime"
          :initial-end-time="initialEndTime"
          :reset-after-create="false"
          :show-create-cancel="true"
          create-button-label="Save Session"
          @saved="handleCreated"
          @toggle-editor="emit('close')"
        />
      </div>
    </div>
  </aside>
</template>
