<script setup lang="ts">
import { computed, type PropType } from 'vue'

import WorkspaceSubheaderShell from '~/components/WorkspaceSubheaderShell.vue'

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
  modeToggleStyles: {
    type: Object as PropType<{
      container?: Record<string, string>
      activeButton?: Record<string, string>
      inactiveButton?: Record<string, string>
    }>,
    default: undefined,
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

/** Inactive segment when project tint is off (neutral rail): subtle darken toward header. */
const MODE_TOGGLE_INACTIVE_NEUTRAL_CLASS =
  'cursor-pointer text-text-muted hover:text-text hover:bg-[linear-gradient(135deg,_color-mix(in_srgb,var(--color-surface-strong)_96%,var(--color-header)_4%),_color-mix(in_srgb,var(--color-surface-strong)_92%,var(--color-header)_8%))]'
/** Inactive segment with `modeToggleStyles`: subtle mix toward solid primary (see project-color-styles). */
const MODE_TOGGLE_INACTIVE_PROJECT_CLASS =
  'cursor-pointer hover:bg-[linear-gradient(135deg,_color-mix(in_srgb,var(--project-mode-toggle-rail)_96%,var(--project-mode-toggle-active)_4%),_color-mix(in_srgb,var(--project-mode-toggle-rail)_92%,var(--project-mode-toggle-active)_8%))]'

const outlineBadgeClassName = computed(() =>
  props.headerStyle.backgroundImage
    ? 'rounded-full border border-overlay-border px-3 py-1.5 text-sm font-semibold'
    : 'rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-text-muted',
)

const getBadgeClassName = (badge: ProjectWorkspaceHeaderBadge) =>
  badge.variant === 'outline'
    ? outlineBadgeClassName.value
    : 'rounded-full border px-3 py-1.5 font-data text-sm tracking-wide'

const getModeButtonStyle = (tab: ProjectWorkspaceTab) => {
  const mt = props.modeToggleStyles
  if (!mt) {
    return undefined
  }

  return tab.id === props.activeMode ? mt.activeButton : mt.inactiveButton
}

const getModeButtonClassName = (tab: ProjectWorkspaceTab) => {
  if (tab.id !== props.activeMode) {
    return props.modeToggleStyles?.inactiveButton
      ? MODE_TOGGLE_INACTIVE_PROJECT_CLASS
      : MODE_TOGGLE_INACTIVE_NEUTRAL_CLASS
  }

  if (props.modeToggleStyles?.activeButton) {
    return 'cursor-pointer bg-transparent'
  }

  return 'cursor-pointer bg-header text-header-text'
}
</script>

<template>
  <WorkspaceSubheaderShell layout="fluid" :surface-style="headerStyle" variant="project">
    <div>
      <div class="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            class="inline-flex rounded-xl border p-1 shadow-control"
            :class="modeToggleStyles?.container ? '' : 'border-border bg-surface-strong'"
            :style="modeToggleStyles?.container"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="getModeButtonClassName(tab)"
              :style="getModeButtonStyle(tab)"
              @click="emit('select-mode', tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="mt-4 w-full text-sm text-danger">
        {{ errorMessage }}
      </p>
    </div>
  </WorkspaceSubheaderShell>
</template>
