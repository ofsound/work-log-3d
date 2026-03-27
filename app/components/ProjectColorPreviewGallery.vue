<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import {
  getProjectAccentTextStyle,
  getProjectBadgeStyle,
  getProjectDuotoneSoftSurfaceStyle,
  getProjectHeaderStyle,
  getProjectModeToggleStyles,
  getProjectOpaqueSoftSurfaceStyle,
  getProjectPickerOptionStyle,
  getProjectSecondaryAccentTextStyle,
  getProjectSecondarySoftSurfaceStyle,
  getProjectSwatchStyle,
} from '~/utils/project-color-styles'
import type { ProjectColors } from '~~/shared/worklog'

const props = withDefaults(
  defineProps<{
    colors: ProjectColors
    name: string
    notes: string
    previewNotesFallback?: string
  }>(),
  {
    previewNotesFallback: 'Notes remain private to the edit page for now.',
  },
)

const MODE_TOGGLE_INACTIVE_PROJECT_CLASS =
  'cursor-pointer hover:bg-[linear-gradient(135deg,_color-mix(in_srgb,var(--project-mode-toggle-rail-start)_96%,var(--project-mode-toggle-active)_4%),_color-mix(in_srgb,var(--project-mode-toggle-rail-end)_92%,var(--project-mode-toggle-active)_8%))]'

const displayName = computed(() => props.name.trim() || 'Project preview')
const displayNotes = computed(() => props.notes.trim() || props.previewNotesFallback)
const headerStyle = computed(() => getProjectHeaderStyle(props.colors))
const badgeStyle = computed(() => getProjectBadgeStyle(props.colors))
const duotoneSurfaceStyle = computed(() => getProjectDuotoneSoftSurfaceStyle(props.colors))
const opaqueSurfaceStyle = computed(() => getProjectOpaqueSoftSurfaceStyle(props.colors))
const secondarySurfaceStyle = computed(() => getProjectSecondarySoftSurfaceStyle(props.colors))
const accentTextStyle = computed(() => getProjectAccentTextStyle(props.colors))
const secondaryTextStyle = computed(() => getProjectSecondaryAccentTextStyle(props.colors))
const pickerSelectedStyle = computed(() => getProjectPickerOptionStyle(props.colors, true))
const pickerUnselectedStyle = computed(() => getProjectPickerOptionStyle(props.colors, false))
const swatchStyle = computed(() => getProjectSwatchStyle(props.colors))
const modeToggleStyles = computed(() => getProjectModeToggleStyles(props.colors))
const projectRowStyle = computed(() => ({
  ...duotoneSurfaceStyle.value,
  '--project-edit-border-hover': props.colors.secondary,
}))
const rowActionStyle = computed(
  () =>
    ({
      '--project-edit-border-hover': props.colors.secondary,
    }) as CSSProperties,
)
</script>

<template>
  <ContainerCard
    class="overflow-hidden rounded-3xl border-overlay-border bg-surface p-0"
    padding="compact"
    variant="overlay"
  >
    <div class="flex flex-col gap-6 px-5 py-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">
            Live project color preview
          </div>
          <div class="mt-1 text-lg font-bold text-text">Representative usage gallery</div>
          <p class="mt-2 max-w-xl text-sm leading-6 text-text-muted">
            Static slices from real project-colored surfaces across the app.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="size-4 rounded-full border border-overlay-border" :style="swatchStyle"></div>
          <div class="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-text">
            {{ colors.primary }}
          </div>
          <div class="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-text">
            {{ colors.secondary }}
          </div>
        </div>
      </div>

      <section class="flex flex-col gap-3" data-test="preview-section-workspace-header">
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Workspace header</div>
        <div class="text-[11px] leading-5 text-text-muted">
          Sources: ProjectWorkspaceHeader, ProjectOverview
        </div>

        <div class="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
          <div class="px-4 py-4" :style="headerStyle">
            <div class="text-xl font-bold">
              {{ displayName }}
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <div
                class="rounded-full border px-3 py-1.5 font-data text-sm tracking-wide"
                :style="badgeStyle"
              >
                18.4 hrs
              </div>
              <div
                class="rounded-full border border-overlay-border px-3 py-1.5 text-sm font-semibold"
              >
                24 sessions
              </div>
              <div
                class="rounded-full border border-overlay-border px-3 py-1.5 text-sm font-semibold"
              >
                Last activity Mar 24, 2026
              </div>
            </div>
          </div>

          <div class="border-t border-border-subtle bg-surface px-4 py-4">
            <div
              class="inline-flex rounded-xl border p-1 shadow-control"
              :style="modeToggleStyles.container"
            >
              <button
                type="button"
                class="cursor-pointer rounded-lg bg-transparent px-4 py-2 text-sm font-semibold"
                :style="modeToggleStyles.activeButton"
              >
                List
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-semibold"
                :class="MODE_TOGGLE_INACTIVE_PROJECT_CLASS"
                :style="modeToggleStyles.inactiveButton"
              >
                Calendar
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-semibold"
                :class="MODE_TOGGLE_INACTIVE_PROJECT_CLASS"
                :style="modeToggleStyles.inactiveButton"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-2" data-test="preview-section-cards-rows">
        <div class="flex flex-col gap-3">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Cards and rows</div>
          <div class="text-[11px] leading-5 text-text-muted">
            Sources: ProjectsManagerProject, TimeBoxViewer
          </div>

          <div class="flex flex-col gap-3">
            <div
              class="rounded-sm border px-3 py-3 shadow-control"
              :style="projectRowStyle"
              data-test="preview-project-row"
            >
              <div class="flex gap-2">
                <div
                  class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 p-1 text-left"
                >
                  <span class="font-bold text-text">{{ displayName }}</span>
                  <span class="font-data text-xs font-normal text-text-muted italic">
                    Jan 5, 2026 – Mar 24, 2026
                  </span>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1.5">
                  <button
                    type="button"
                    class="cursor-pointer rounded-md border border-solid border-button-secondary-border bg-transparent px-2 py-1 text-xs font-semibold text-button-secondary-text transition-[border-color] duration-150 hover:[border-color:var(--project-edit-border-hover)]"
                    :style="rowActionStyle"
                  >
                    Edit
                  </button>
                  <div
                    class="rounded-md px-1.5 py-0.5 pt-px font-data text-xs tracking-wide"
                    :style="badgeStyle"
                  >
                    128.4 hrs
                  </div>
                </div>
              </div>
            </div>

            <ContainerCard
              class="rounded-xl py-4"
              padding="compact"
              :style="duotoneSurfaceStyle"
              variant="subtle"
            >
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-semibold" :style="accentTextStyle">{{ displayName }}</div>
                    <div class="mt-1 text-sm text-text-muted">Tuesday, Mar 24</div>
                  </div>
                  <div
                    class="rounded-full border px-3 py-1 text-xs font-semibold"
                    :style="badgeStyle"
                  >
                    95m
                  </div>
                </div>
                <p class="text-sm leading-6 text-text-muted">
                  {{ displayNotes }}
                </p>
              </div>
            </ContainerCard>

            <ContainerCard
              class="rounded-xl py-4"
              padding="compact"
              :style="opaqueSurfaceStyle"
              variant="subtle"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="font-semibold text-text">Opaque session surface</div>
                  <div class="mt-1 text-sm" :style="secondaryTextStyle">
                    Used in denser panel states
                  </div>
                </div>
                <div
                  class="rounded-full border px-3 py-1 text-xs font-semibold"
                  :style="badgeStyle"
                >
                  3:45
                </div>
              </div>
            </ContainerCard>
          </div>
        </div>

        <div class="flex flex-col gap-3" data-test="preview-section-calendar-density">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Calendar density</div>
          <div class="text-[11px] leading-5 text-text-muted">
            Sources: SessionsMonthView, ProjectCalendarView, SessionsTimedGrid
          </div>

          <div class="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div class="overflow-hidden rounded-xl border border-border-subtle bg-surface">
              <div class="flex items-center justify-between border-b border-border px-3 py-2">
                <div class="font-semibold text-text">24</div>
                <div
                  class="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-text-inverse"
                >
                  Today
                </div>
              </div>
              <div class="flex flex-col gap-1.5 px-3 py-3">
                <button
                  type="button"
                  class="cursor-pointer rounded-md border px-2 py-1 text-left text-xs text-text"
                  :style="duotoneSurfaceStyle"
                >
                  <div class="flex items-start justify-between gap-2 overflow-hidden">
                    <div class="min-w-0 flex-1 truncate">
                      <span class="font-semibold">9:00</span>
                      <span class="ml-1">{{ displayName }}</span>
                    </div>
                    <div
                      class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                      :style="badgeStyle"
                    >
                      45m
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  class="cursor-pointer rounded-md border px-2 py-1 text-left text-xs text-text"
                  :style="duotoneSurfaceStyle"
                >
                  <div class="flex items-start justify-between gap-2 overflow-hidden">
                    <div class="min-w-0 flex-1 truncate">
                      <span class="font-semibold">2:30</span>
                      <span class="ml-1">Review pass</span>
                    </div>
                    <div
                      class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                      :style="badgeStyle"
                    >
                      30m
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  class="cursor-pointer rounded-md border border-dashed border-border px-2 py-1 text-left text-xs font-semibold text-text-subtle"
                >
                  +2 more
                </button>
              </div>
            </div>

            <div class="overflow-hidden rounded-xl border border-border-subtle bg-surface">
              <div class="grid grid-cols-[3.25rem_minmax(0,1fr)]">
                <div
                  class="border-r border-border bg-surface-muted px-2 py-3 text-right text-[11px] text-text-subtle"
                >
                  <div>9 AM</div>
                  <div class="mt-8">10 AM</div>
                  <div class="mt-8">11 AM</div>
                </div>
                <div class="relative h-40 bg-surface px-2 py-3">
                  <div class="absolute inset-x-0 top-13 border-t border-border-subtle"></div>
                  <div class="absolute inset-x-0 top-25 border-t border-border-subtle"></div>
                  <div
                    class="absolute right-1.5 left-1.5 rounded-md border px-3 py-2 shadow-control"
                    :style="{
                      top: '1.25rem',
                      height: '4.75rem',
                      ...duotoneSurfaceStyle,
                    }"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="font-semibold text-text">{{ displayName }}</div>
                        <div class="mt-1 text-xs" :style="secondaryTextStyle">Deep work block</div>
                      </div>
                      <div
                        class="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                        :style="badgeStyle"
                      >
                        95m
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div class="flex flex-col gap-3" data-test="preview-section-support-usage">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">
            Secondary and support usage
          </div>
          <div class="text-[11px] leading-5 text-text-muted">
            Sources: SessionListFilterPanel, ProjectsManagerProject
          </div>

          <ContainerCard class="flex flex-col gap-3 rounded-xl" padding="compact" variant="muted">
            <div class="flex flex-wrap items-center gap-2">
              <div
                class="rounded-full border px-3 py-1 text-xs font-semibold text-text"
                :style="secondarySurfaceStyle"
              >
                Project: {{ displayName }}
              </div>
              <div class="rounded-full border px-3 py-1 text-xs font-semibold text-text">
                Date: Mar 1 - Mar 24
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="text-sm font-semibold" :style="secondaryTextStyle">
                Secondary accent text
              </div>
              <div class="text-sm font-semibold" :style="accentTextStyle">Primary accent text</div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="cursor-pointer rounded-md border border-solid border-button-secondary-border bg-transparent px-2 py-1 text-xs font-semibold text-button-secondary-text transition-[border-color] duration-150 hover:[border-color:var(--project-edit-border-hover)]"
                :style="rowActionStyle"
              >
                Subtle border hover
              </button>
              <div class="text-xs text-text-muted">
                Secondary is often felt through tint and border, not fill.
              </div>
            </div>
          </ContainerCard>
        </div>

        <div class="flex flex-col gap-3" data-test="preview-section-selection-states">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Selection states</div>
          <div class="text-[11px] leading-5 text-text-muted">Sources: TimeBoxEditor</div>

          <div class="grid gap-2 md:grid-cols-2">
            <label
              class="flex min-w-0 items-center gap-3 rounded-md border border-solid px-3 py-3 shadow-panel-selected transition-[border-color,box-shadow,filter] duration-150 ease-out hover:brightness-[1.02]"
              :style="pickerSelectedStyle"
            >
              <input checked type="radio" name="previewProjectSelection" class="shrink-0" />
              <span class="min-w-0 text-base font-medium">{{ displayName }}</span>
            </label>

            <label
              class="project-radio-option-muted flex min-w-0 items-center gap-3 rounded-md border border-solid px-3 py-3 shadow-control transition-[border-color,box-shadow,filter] duration-150 ease-out"
              :style="pickerUnselectedStyle"
            >
              <input type="radio" name="previewProjectSelection" class="shrink-0" />
              <span class="min-w-0 text-base font-medium text-text">Muted option</span>
            </label>
          </div>

          <div class="text-sm leading-6 text-text-muted">
            Selected uses the full gradient. Unselected keeps the pairing subtle until hover and
            selection.
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3" data-test="preview-section-minimal-scale">
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Minimal scale check</div>
        <div class="text-[11px] leading-5 text-text-muted">
          Sources: badges, swatches, compact chips
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div
            class="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            :style="badgeStyle"
          >
            45m
          </div>
          <div
            class="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-text"
            :style="secondarySurfaceStyle"
          >
            Filter chip
          </div>
          <div class="size-3 rounded-full border border-overlay-border" :style="swatchStyle"></div>
          <div class="size-5 rounded-md border" :style="duotoneSurfaceStyle"></div>
          <div class="text-xs" :style="secondaryTextStyle">Meta text</div>
        </div>
      </section>
    </div>
  </ContainerCard>
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
