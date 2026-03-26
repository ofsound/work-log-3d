<script setup lang="ts">
import { computed, type PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

import AppButton from '~/components/AppButton.vue'
import AppSegmentedControl from '~/components/AppSegmentedControl.vue'
import WorkspaceSubheaderShell from '~/components/WorkspaceSubheaderShell.vue'
import type { SessionsViewMode } from '~/utils/sessions-route-state'

interface SessionsWorkspaceHeaderSummary {
  count: number
  durationLabel: string
  projectCount: number
}

const props = defineProps({
  calendarHeaderSummary: {
    type: Object as PropType<SessionsWorkspaceHeaderSummary | null>,
    default: null,
  },
  currentMode: {
    type: String as PropType<SessionsViewMode>,
    required: true,
  },
  listSummary: {
    type: Object as PropType<SessionsWorkspaceHeaderSummary>,
    required: true,
  },
  mutationErrorMessage: { type: String, default: '' },
  pageTitle: { type: String, required: true },
  sessionViewItems: {
    type: Array as PropType<ReadonlyArray<{ id: SessionsViewMode; label: string }>>,
    required: true,
  },
})

const emit = defineEmits<{
  'clear-filters': []
  'go-today': []
  'navigate-period': [direction: -1 | 1]
  'select-mode': [mode: SessionsViewMode]
}>()

const showPeriodNavigation = computed(
  () => props.currentMode !== 'search' && props.currentMode !== 'year',
)
const segmentedItems = computed(() => props.sessionViewItems.map((item) => ({ ...item })))
const periodNavigationRowClassName = 'flex min-h-9 items-center gap-2'

const handleModeSelect = (modeId: string) => {
  emit('select-mode', modeId as SessionsViewMode)
}
</script>

<template>
  <WorkspaceSubheaderShell layout="fluid" variant="neutral">
    <div class="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="text-3xl font-bold tracking-tight">{{ pageTitle }}</div>
        <div v-if="calendarHeaderSummary" class="mt-3 flex flex-wrap gap-2">
          <div
            class="rounded-lg bg-badge-duration px-3 py-1.5 text-sm font-bold tracking-tight text-badge-duration-text tabular-nums"
          >
            {{ calendarHeaderSummary.durationLabel }} hrs
          </div>
          <div
            class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text"
          >
            {{ calendarHeaderSummary.count }} sessions
          </div>
          <div
            class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text"
          >
            {{ calendarHeaderSummary.projectCount }} projects
          </div>
        </div>

        <div v-else-if="currentMode === 'search'" class="mt-3 flex flex-wrap items-center gap-2">
          <div
            class="rounded-lg bg-badge-duration px-3 py-1.5 text-sm font-bold tracking-tight text-badge-duration-text tabular-nums"
          >
            {{ listSummary.durationLabel }} hrs
          </div>
          <div
            class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text"
          >
            {{ listSummary.count }} matches
          </div>
          <div
            class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text"
          >
            {{ listSummary.projectCount }} projects
          </div>
          <AppButton
            shape="pill"
            size="sm"
            variant="secondary"
            class="ms-4 shrink-0 gap-1.5 border border-dashed border-border-strong bg-surface-muted font-semibold text-text shadow-none hover:border-border hover:bg-surface-strong"
            @click="emit('clear-filters')"
          >
            <CloseIcon aria-hidden="true" class="!h-3.5 !w-3.5 shrink-0 opacity-[0.85]" />
            Clear all
          </AppButton>
        </div>
      </div>

      <div class="flex flex-col items-end gap-2">
        <AppSegmentedControl
          :active-id="currentMode"
          aria-label="Sessions view modes"
          :items="segmentedItems"
          size="large"
          @select="handleModeSelect"
        />

        <div v-if="showPeriodNavigation" :class="periodNavigationRowClassName">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center justify-center rounded-md border border-button-secondary-border bg-button-secondary p-1.5 text-button-secondary-text hover:bg-button-secondary-hover"
            aria-label="Previous period"
            @click="emit('navigate-period', -1)"
          >
            <svg
              class="h-5 w-5 shrink-0"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <AppButton size="sm" variant="secondary" @click="emit('go-today')">Today</AppButton>
          <button
            type="button"
            class="inline-flex cursor-pointer items-center justify-center rounded-md border border-button-secondary-border bg-button-secondary p-1.5 text-button-secondary-text hover:bg-button-secondary-hover"
            aria-label="Next period"
            @click="emit('navigate-period', 1)"
          >
            <svg
              class="h-5 w-5 shrink-0"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div
          v-else
          :class="periodNavigationRowClassName"
          aria-hidden="true"
          data-test="nav-spacer"
        />
      </div>
    </div>

    <template v-if="mutationErrorMessage" #footer>
      <p class="text-sm text-danger">
        {{ mutationErrorMessage }}
      </p>
    </template>
  </WorkspaceSubheaderShell>
</template>
