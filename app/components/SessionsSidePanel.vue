<script setup lang="ts">
import type { PropType } from 'vue'

import { formatDateKey } from '~~/shared/worklog'

const props = defineProps({
  mode: { type: String as PropType<'session' | 'create'>, required: true },
  day: { type: Date, default: undefined },
  sessionId: { type: String, default: undefined },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
})

const emit = defineEmits(['close', 'created'])

const dayTitle = computed(
  () =>
    props.day?.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) ?? '',
)

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
        <div v-if="mode === 'session'" class="text-lg font-bold">Session</div>
        <div v-else class="text-lg font-bold">New Session</div>
        <div class="text-sm text-text-subtle">
          <span v-if="mode === 'create'">
            {{
              day
                ? `Prefilled for ${dayTitle || formatDateKey(day)}`
                : 'Prefilled from the calendar selection'
            }}
          </span>
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

    <div class="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4">
      <div v-if="mode === 'session' && sessionId">
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
