<script setup lang="ts">
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
  resultCount: number
  totalDurationLabel: string
}>()

const emit = defineEmits<{
  'update-filters': [value: Partial<SessionListFilters>]
  'clear-filters': []
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
  <section
    class="sticky top-0 z-10 rounded-2xl border border-border-subtle bg-surface/96 px-5 py-5 shadow-panel backdrop-blur"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">List Filters</div>
          <div class="mt-1 text-2xl font-bold text-text">Search your sessions</div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div
            class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text shadow-sm"
          >
            {{ resultCount }} matches
          </div>
          <div
            class="rounded-lg bg-badge-duration px-3 py-1.5 text-sm font-bold tracking-tight text-badge-duration-text tabular-nums shadow-sm"
          >
            {{ totalDurationLabel }} hrs
          </div>
          <button
            type="button"
            class="cursor-pointer rounded-full border border-button-secondary-border bg-button-secondary px-3 py-1.5 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
            @click="emit('clear-filters')"
          >
            Clear all
          </button>
        </div>
      </div>

      <div
        class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.65fr)]"
      >
        <label class="flex min-w-0 flex-col gap-2">
          <span class="text-sm font-semibold text-text">Search</span>
          <input
            :value="filters.query"
            type="text"
            class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
            :placeholder="
              hideTags ? 'Search notes and projects' : 'Search notes, projects, and tags'
            "
            @input="
              updateFilters({
                query: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>

        <SessionListMultiSelect
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
          :disabled="filters.untaggedOnly"
          :model-value="filters.tagIds"
          :options="tags.map((tag) => ({ id: tag.id, label: tag.name }))"
          label="Tags"
          placeholder="All tags"
          @update:model-value="updateFilters({ tagIds: $event })"
        />

        <label class="flex min-w-0 flex-col gap-2">
          <span class="text-sm font-semibold text-text">Sort</span>
          <select
            :value="filters.sort"
            class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
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
          </select>
        </label>
      </div>

      <div
        class="grid gap-4"
        :class="
          hideTags
            ? 'xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.85fr)]'
            : 'xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.85fr)]'
        "
      >
        <div v-if="!hideTags" class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-text">Tag matching</span>
          <div
            class="inline-flex rounded-xl border border-border bg-surface-strong p-1 shadow-control"
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
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-text">Quick ranges</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in datePresets"
              :key="preset.id"
              type="button"
              class="cursor-pointer rounded-full border border-button-secondary-border bg-button-secondary px-3 py-1.5 text-sm text-button-secondary-text hover:bg-button-secondary-hover"
              @click="applyDatePreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-text">From</span>
            <input
              :value="filters.dateStart"
              type="date"
              class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
              @input="
                updateFilters({
                  dateStart: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-text">To</span>
            <input
              :value="filters.dateEnd"
              type="date"
              class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
              @input="
                updateFilters({
                  dateEnd: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-text">Notes</span>
          <select
            :value="filters.notesState"
            class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
            @change="handleNotesStateChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="any">Any</option>
            <option value="with">Has notes</option>
            <option value="empty">Empty notes</option>
          </select>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-text">Minimum duration</span>
          <input
            :value="filters.minMinutes ?? ''"
            type="number"
            min="0"
            class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
            placeholder="No minimum"
            @input="handleMinutesInput('minMinutes', ($event.target as HTMLInputElement).value)"
          />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="minutes in [15, 30, 60, 120]"
              :key="`min-${minutes}`"
              type="button"
              class="cursor-pointer rounded-full border border-button-secondary-border bg-button-secondary px-3 py-1 text-xs font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="updateFilters({ minMinutes: minutes })"
            >
              {{ minutes }}m
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-text">Maximum duration</span>
          <input
            :value="filters.maxMinutes ?? ''"
            type="number"
            min="0"
            class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
            placeholder="No maximum"
            @input="handleMinutesInput('maxMinutes', ($event.target as HTMLInputElement).value)"
          />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="minutes in [30, 60, 120, 240]"
              :key="`max-${minutes}`"
              type="button"
              class="cursor-pointer rounded-full border border-button-secondary-border bg-button-secondary px-3 py-1 text-xs font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="updateFilters({ maxMinutes: minutes })"
            >
              {{ minutes }}m
            </button>
          </div>
        </div>

        <label
          v-if="!hideTags"
          class="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4 text-sm text-text"
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
        </label>
      </div>

      <div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-2">
        <button
          v-for="chip in activeFilterChips"
          :key="chip.id"
          type="button"
          class="cursor-pointer rounded-full border bg-surface px-3 py-1.5 text-xs font-semibold text-text"
          :style="chip.style"
          @click="updateFilters(chip.patch)"
        >
          {{ chip.label }} ×
        </button>
      </div>
    </div>
  </section>
</template>
