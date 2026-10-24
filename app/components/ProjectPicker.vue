<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

import AppField from '~/components/AppField.vue'
import ContainerCard from '~/components/ContainerCard.vue'
import {
  APP_FIELD_CONTROL_POPOVER_INPUT_CLASS_NAME,
  getAppFieldControlTriggerClassName,
} from '~/utils/app-field'
import { getProjectSwatchStyle } from '~/utils/project-color-styles'
import { searchProjectTitles } from '~/utils/project-title-search'

import type { Project } from '~~/shared/worklog'

const props = defineProps<{
  modelValue: string
  projects: Pick<Project, 'id' | 'name' | 'colors'>[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const searchButton = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLDialogElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const resultsElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const selectedProject = computed(() =>
  props.projects.find((project) => project.id === props.modelValue),
)
const results = computed(() => searchProjectTitles(props.projects, query.value))
const activeOptionId = computed(() =>
  results.value[activeIndex.value] ? `${id}-option-${activeIndex.value}` : undefined,
)

const close = () => {
  dialog.value?.close()
  isOpen.value = false
  query.value = ''
  searchButton.value?.focus()
}

const open = async () => {
  if (isOpen.value) {
    close()
    return
  }
  query.value = ''
  activeIndex.value = Math.max(
    0,
    props.projects.findIndex((project) => project.id === props.modelValue),
  )
  isOpen.value = true
  await nextTick()
  dialog.value?.showModal()
  searchInput.value?.focus()
  scrollActiveIntoView()
}

const choose = (index: number) => {
  const project = results.value[index]
  if (!project) return
  emit('update:modelValue', project.id)
  close()
}

const scrollActiveIntoView = () => {
  void nextTick(() => {
    resultsElement.value
      ?.querySelector<HTMLElement>(`[id="${activeOptionId.value}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  })
}

const handleSearchKey = (event: KeyboardEvent) => {
  if (event.isComposing) return
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) {
    // Home/End keep their usual text editing meaning unless Alt is held.
    if (['Home', 'End'].includes(event.key) && !event.altKey) return
    event.preventDefault()
    if (event.key === 'Enter') {
      choose(activeIndex.value)
      return
    }
    const count = results.value.length
    if (!count) return
    if (event.key === 'Home') activeIndex.value = 0
    else if (event.key === 'End') activeIndex.value = count - 1
    else
      activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
    scrollActiveIntoView()
  }
}

// Handle Escape before the editor's capture listener, so it only dismisses the picker.
const handleEscape = (event: KeyboardEvent) => {
  if (isOpen.value && event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    close()
  }
}
watch(results, () => {
  activeIndex.value = 0
  scrollActiveIntoView()
})

onMounted(() => {
  window.addEventListener('keydown', handleEscape, { capture: true })
})
onBeforeUnmount(() => {
  dialog.value?.close()
  window.removeEventListener('keydown', handleEscape, { capture: true })
})
</script>

<template>
  <AppField as="div" label="Project">
    <button
      ref="searchButton"
      type="button"
      :class="getAppFieldControlTriggerClassName()"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="`${id}-dialog`"
      @click="open()"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span
          v-if="selectedProject"
          class="size-3.5 shrink-0 rounded-full"
          :style="getProjectSwatchStyle(selectedProject.colors)"
        />
        <span class="min-w-0 truncate">{{ selectedProject?.name || 'Choose a project' }}</span>
      </span>
    </button>
    <Teleport to="body">
      <dialog
        :id="`${id}-dialog`"
        ref="dialog"
        aria-label="Search projects"
        aria-modal="true"
        class="fixed inset-x-0 top-[15vh] z-[70] mx-auto my-0 max-h-[70dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden bg-transparent p-0 font-data text-text outline-none backdrop:bg-overlay-scrim"
        @click.self="close()"
        @cancel.prevent="close()"
        @keydown.stop
      >
        <ContainerCard
          padding="compact"
          class="flex max-h-[inherit] min-h-0 flex-col gap-2 shadow-panel"
        >
          <AppField as="div">
            <input
              ref="searchInput"
              v-model="query"
              :class="APP_FIELD_CONTROL_POPOVER_INPUT_CLASS_NAME"
              class="w-full shrink-0"
              type="text"
              role="combobox"
              aria-label="Search project titles"
              aria-autocomplete="list"
              :aria-expanded="isOpen"
              :aria-controls="`${id}-results`"
              :aria-activedescendant="activeOptionId"
              placeholder="Search projects…"
              autocomplete="off"
              @keydown="handleSearchKey"
            />
          </AppField>
          <div
            :id="`${id}-results`"
            ref="resultsElement"
            role="listbox"
            aria-label="Projects"
            class="min-h-0 overflow-y-auto overscroll-contain"
          >
            <div
              v-for="(project, index) in results"
              :id="`${id}-option-${index}`"
              :key="project.id"
              role="option"
              :aria-selected="project.id === modelValue"
              class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
              :class="index === activeIndex ? 'bg-link/10 text-link' : 'hover:bg-surface-subtle'"
              @pointermove="activeIndex = index"
              @mousedown.prevent
              @click="choose(index)"
            >
              <span
                class="size-3.5 shrink-0 rounded-full"
                :style="getProjectSwatchStyle(project.colors)"
              />
              <span class="min-w-0 flex-1 break-words">{{ project.name }}</span>
              <span v-if="project.id === modelValue" aria-label="Current project">✓</span>
            </div>
            <p v-if="!results.length" role="status" class="px-3 py-5 text-sm text-text-muted">
              {{
                projects.length
                  ? 'No matching projects. Try another fragment.'
                  : 'No projects available.'
              }}
            </p>
          </div>
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle pt-2 text-xs text-text-muted"
          >
            <span>↑↓ navigate · Enter select</span>
            <button
              type="button"
              class="rounded px-2 py-1 hover:bg-surface-subtle"
              @click="close()"
            >
              Esc · Close
            </button>
          </div>
        </ContainerCard>
      </dialog>
    </Teleport>
  </AppField>
</template>
