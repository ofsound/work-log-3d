<script setup lang="ts">
import { computed } from 'vue'

import { getProjectSoftSurfaceStyle, getProjectSwatchStyle } from '~/utils/project-color-styles'
import {
  addDays,
  formatDateKey,
  getStartOfWeek,
  type NamedEntity,
  type Project,
  type SessionListFilters,
  type SessionNotesState,
} from '~~/shared/worklog'

interface ActiveFilterChip {
  id: string
  label: string
  patch: Partial<SessionListFilters>
  style?: Record<string, string>
}

interface DatePreset {
  id: string
  label: string
  dateStart: string
  dateEnd: string
}

const props = defineProps<{
  filters: SessionListFilters
  projects: Project[]
  tags: NamedEntity[]
  hideTags?: boolean
}>()

const emit = defineEmits<{
  'update-filters': [value: Partial<SessionListFilters>]
}>()

const projectNameById = computed(() =>
  Object.fromEntries(props.projects.map((project) => [project.id, project.name])),
)
const projectById = computed(() =>
  Object.fromEntries(props.projects.map((project) => [project.id, project])),
)
const tagNameById = computed(() => Object.fromEntries(props.tags.map((tag) => [tag.id, tag.name])))
const today = computed(() => new Date())
const datePresets = computed<DatePreset[]>(() => {
  const currentDay = today.value
  const todayKey = formatDateKey(currentDay)
  const yesterday = addDays(currentDay, -1)
  const startOfThisWeek = getStartOfWeek(currentDay)
  const startOfLastWeek = addDays(startOfThisWeek, -7)
  const endOfLastWeek = addDays(startOfThisWeek, -1)
  const startOfThisMonth = new Date(currentDay.getFullYear(), currentDay.getMonth(), 1)
  const startOfLastMonth = new Date(currentDay.getFullYear(), currentDay.getMonth() - 1, 1)
  const endOfLastMonth = addDays(startOfThisMonth, -1)

  return [
    { id: 'today', label: 'Today', dateStart: todayKey, dateEnd: todayKey },
    {
      id: 'yesterday',
      label: 'Yesterday',
      dateStart: formatDateKey(yesterday),
      dateEnd: formatDateKey(yesterday),
    },
    {
      id: 'this-week',
      label: 'This week',
      dateStart: formatDateKey(startOfThisWeek),
      dateEnd: todayKey,
    },
    {
      id: 'last-week',
      label: 'Last week',
      dateStart: formatDateKey(startOfLastWeek),
      dateEnd: formatDateKey(endOfLastWeek),
    },
    {
      id: 'this-month',
      label: 'This month',
      dateStart: formatDateKey(startOfThisMonth),
      dateEnd: todayKey,
    },
    {
      id: 'last-month',
      label: 'Last month',
      dateStart: formatDateKey(startOfLastMonth),
      dateEnd: formatDateKey(endOfLastMonth),
    },
    {
      id: 'last-30-days',
      label: 'Last 30 days',
      dateStart: formatDateKey(addDays(currentDay, -29)),
      dateEnd: todayKey,
    },
  ]
})
const activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const chips: ActiveFilterChip[] = []

  if (props.filters.query) {
    chips.push({
      id: 'query',
      label: `Search: ${props.filters.query}`,
      patch: { query: '' },
    })
  }

  props.filters.projectIds.forEach((projectId) => {
    const project = projectById.value[projectId]

    chips.push({
      id: `project-${projectId}`,
      label: `Project: ${projectNameById.value[projectId] ?? projectId}`,
      patch: {
        projectIds: props.filters.projectIds.filter((id) => id !== projectId),
      },
      style: project
        ? (getProjectSoftSurfaceStyle(project.colors) as Record<string, string>)
        : undefined,
    })
  })

  if (props.hideTags) {
    if (
      props.filters.tagIds.length > 0 ||
      props.filters.tagMode === 'all' ||
      props.filters.untaggedOnly
    ) {
      chips.push({
        id: 'legacy-tags',
        label: 'Legacy tag filters active',
        patch: {
          tagIds: [],
          tagMode: 'any',
          untaggedOnly: false,
        },
      })
    }
  } else {
    props.filters.tagIds.forEach((tagId) => {
      chips.push({
        id: `tag-${tagId}`,
        label: `Tag: ${tagNameById.value[tagId] ?? tagId}`,
        patch: {
          tagIds: props.filters.tagIds.filter((id) => id !== tagId),
        },
      })
    })

    if (props.filters.tagIds.length > 0 && props.filters.tagMode === 'all') {
      chips.push({
        id: 'tag-mode',
        label: 'Tag mode: All',
        patch: { tagMode: 'any' },
      })
    }
  }

  if (props.filters.dateStart || props.filters.dateEnd) {
    chips.push({
      id: 'date-range',
      label: `Date: ${props.filters.dateStart || 'Any'} - ${props.filters.dateEnd || 'Any'}`,
      patch: { dateStart: '', dateEnd: '' },
    })
  }

  if (props.filters.minMinutes !== null) {
    chips.push({
      id: 'min-minutes',
      label: `Min: ${props.filters.minMinutes}m`,
      patch: { minMinutes: null },
    })
  }

  if (props.filters.maxMinutes !== null) {
    chips.push({
      id: 'max-minutes',
      label: `Max: ${props.filters.maxMinutes}m`,
      patch: { maxMinutes: null },
    })
  }

  if (!props.hideTags && props.filters.untaggedOnly) {
    chips.push({
      id: 'untagged',
      label: 'Untagged only',
      patch: { untaggedOnly: false },
    })
  }

  if (props.filters.notesState !== 'any') {
    chips.push({
      id: 'notes-state',
      label: props.filters.notesState === 'with' ? 'Has notes' : 'Empty notes',
      patch: { notesState: 'any' },
    })
  }

  return chips
})

const updateFilters = (value: Partial<SessionListFilters>) => {
  emit('update-filters', value)
}

const handleMinutesInput = (field: 'minMinutes' | 'maxMinutes', value: string) => {
  const normalized = value.trim()

  if (!normalized) {
    updateFilters({ [field]: null })
    return
  }

  const parsed = Number(normalized)

  updateFilters({
    [field]: Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null,
  })
}

const applyDatePreset = (preset: DatePreset) => {
  updateFilters({
    dateStart: preset.dateStart,
    dateEnd: preset.dateEnd,
  })
}

const handleNotesStateChange = (value: string) => {
  updateFilters({
    notesState: value as SessionNotesState,
  })
}
</script>

<template>
  <div class="h-full min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-contain py-5">
    <div class="flex min-w-0 flex-col gap-5 px-4">
      <div class="flex min-w-0 flex-col gap-4">
        <AppField class="min-w-0" label="Search">
          <AppTextInput
            :value="filters.query"
            type="text"
            :placeholder="
              hideTags ? 'Search notes and projects' : 'Search notes, projects, and tags'
            "
            @input="
              updateFilters({
                query: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </AppField>

        <SessionListMultiSelect
          class="min-w-0"
          :model-value="filters.projectIds"
          :options="
            projects.map((project) => ({
              id: project.id,
              label: project.name,
              swatchStyle: getProjectSwatchStyle(project.colors),
            }))
          "
          label="Projects"
          placeholder="All projects"
          @update:model-value="updateFilters({ projectIds: $event })"
        />

        <SessionListMultiSelect
          v-if="!hideTags"
          class="min-w-0"
          :disabled="filters.untaggedOnly"
          :model-value="filters.tagIds"
          :options="tags.map((tag) => ({ id: tag.id, label: tag.name }))"
          label="Tags"
          placeholder="All tags"
          @update:model-value="updateFilters({ tagIds: $event })"
        />

        <AppField class="min-w-0" label="Sort">
          <AppSelect
            :value="filters.sort"
            @change="
              updateFilters({
                sort: ($event.target as HTMLSelectElement).value as SessionListFilters['sort'],
              })
            "
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="longest">Longest</option>
            <option value="shortest">Shortest</option>
          </AppSelect>
        </AppField>
      </div>

      <div class="flex min-w-0 flex-col gap-4">
        <AppField v-if="!hideTags" as="div" class="min-w-0" label="Tag matching">
          <div
            class="inline-flex w-fit max-w-full rounded-xl border border-border bg-surface-strong p-1 shadow-control"
          >
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition"
              :class="
                filters.tagMode === 'any'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="updateFilters({ tagMode: 'any' })"
            >
              Any
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition"
              :class="
                filters.tagMode === 'all'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="updateFilters({ tagMode: 'all' })"
            >
              All
            </button>
          </div>
        </AppField>

        <AppField as="div" class="min-w-0" label="Quick ranges">
          <div class="flex flex-wrap gap-2">
            <AppButton
              v-for="preset in datePresets"
              :key="preset.id"
              shape="pill"
              size="sm"
              variant="secondary"
              @click="applyDatePreset(preset)"
            >
              {{ preset.label }}
            </AppButton>
          </div>
        </AppField>

        <AppField class="min-w-0" label="From">
          <AppTextInput
            :value="filters.dateStart"
            type="date"
            @input="
              updateFilters({
                dateStart: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </AppField>
        <AppField class="min-w-0" label="To">
          <AppTextInput
            :value="filters.dateEnd"
            type="date"
            @input="
              updateFilters({
                dateEnd: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </AppField>

        <AppField as="div" class="min-w-0" label="Notes">
          <AppSelect
            :value="filters.notesState"
            @change="handleNotesStateChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="any">Any</option>
            <option value="with">Has notes</option>
            <option value="empty">Empty notes</option>
          </AppSelect>
        </AppField>
      </div>

      <div class="flex min-w-0 flex-col gap-4">
        <AppField as="div" class="min-w-0" label="Minimum duration">
          <AppTextInput
            :value="filters.minMinutes ?? ''"
            type="number"
            min="0"
            placeholder="No minimum"
            @input="handleMinutesInput('minMinutes', ($event.target as HTMLInputElement).value)"
          />
          <div class="flex flex-wrap gap-2">
            <AppButton
              v-for="minutes in [15, 30, 60, 120]"
              :key="`min-${minutes}`"
              shape="pill"
              size="sm"
              variant="secondary"
              class="py-1 text-xs font-semibold"
              @click="updateFilters({ minMinutes: minutes })"
            >
              {{ minutes }}m
            </AppButton>
          </div>
        </AppField>

        <AppField as="div" class="min-w-0" label="Maximum duration">
          <AppTextInput
            :value="filters.maxMinutes ?? ''"
            type="number"
            min="0"
            placeholder="No maximum"
            @input="handleMinutesInput('maxMinutes', ($event.target as HTMLInputElement).value)"
          />
          <div class="flex flex-wrap gap-2">
            <AppButton
              v-for="minutes in [30, 60, 120, 240]"
              :key="`max-${minutes}`"
              shape="pill"
              size="sm"
              variant="secondary"
              class="py-1 text-xs font-semibold"
              @click="updateFilters({ maxMinutes: minutes })"
            >
              {{ minutes }}m
            </AppButton>
          </div>
        </AppField>

        <ContainerCard
          v-if="!hideTags"
          class="flex min-w-0 items-center gap-3 text-sm text-text shadow-none"
          padding="compact"
          variant="muted"
        >
          <input
            :checked="filters.untaggedOnly"
            type="checkbox"
            @change="
              updateFilters({
                untaggedOnly: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          Only show untagged sessions
        </ContainerCard>
      </div>

      <div v-if="activeFilterChips.length > 0" class="flex min-w-0 flex-wrap gap-2">
        <button
          v-for="chip in activeFilterChips"
          :key="chip.id"
          type="button"
          class="cursor-pointer rounded-full border bg-surface px-3 py-1.5 text-left text-xs font-semibold text-text"
          :style="chip.style"
          @click="updateFilters(chip.patch)"
        >
          {{ chip.label }} ×
        </button>
      </div>
    </div>
  </div>
</template>
