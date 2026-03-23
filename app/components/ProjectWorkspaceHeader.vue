<script setup lang="ts">
import type { PropType } from 'vue'

import {
  PROJECT_WORKSPACE_TABS,
  type ProjectWorkspaceMode,
  type ProjectWorkspaceTab,
} from '~/utils/project-route-state'

interface ProjectWorkspaceHeaderBadge {
  label: string
  style?: Record<string, string>
  variant?: 'accent' | 'outline'
}

const props = defineProps({
  activeMode: {
    type: String as PropType<ProjectWorkspaceMode | null>,
    default: null,
  },
  badges: {
    type: Array as PropType<ProjectWorkspaceHeaderBadge[]>,
    default: () => [],
  },
  errorMessage: { type: String, default: '' },
  headerStyle: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
  title: { type: String, required: true },
  tabs: {
    type: Array as PropType<readonly ProjectWorkspaceTab[]>,
    default: () => PROJECT_WORKSPACE_TABS,
  },
})

const emit = defineEmits<{
  'select-mode': [mode: ProjectWorkspaceMode]
}>()

const getBadgeClassName = (badge: ProjectWorkspaceHeaderBadge) =>
  badge.variant === 'outline'
    ? 'rounded-full border border-white/20 px-3 py-1.5 text-sm font-semibold'
    : 'rounded-full border px-3 py-1.5 font-data text-sm tracking-wide'

const getModeButtonClassName = (tab: ProjectWorkspaceTab) =>
  tab.id === props.activeMode ? 'bg-header text-header-text' : 'text-text-muted hover:bg-surface'
</script>

<template>
  <div class="relative z-10 border-b border-border px-6 py-5 shadow-overview" :style="headerStyle">
    <div
      class="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex flex-col gap-3">
        <div class="text-3xl font-bold tracking-tight">{{ title }}</div>

        <div v-if="badges.length > 0" class="flex flex-wrap items-center gap-2">
          <div
            v-for="badge in badges"
            :key="badge.label"
            :class="getBadgeClassName(badge)"
            :style="badge.style"
          >
            {{ badge.label }}
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 lg:justify-end">
        <div
          v-if="tabs.length > 0"
          class="inline-flex rounded-xl border border-border bg-surface-strong p-1 shadow-control"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition"
            :class="getModeButtonClassName(tab)"
            @click="emit('select-mode', tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="mx-auto mt-4 w-full max-w-6xl text-sm text-danger">
      {{ errorMessage }}
    </p>
  </div>
</template>
