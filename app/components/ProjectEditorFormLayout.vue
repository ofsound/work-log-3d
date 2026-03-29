<script setup lang="ts">
import { computed, type PropType } from 'vue'

import { getProjectPickerOptionStyle, getProjectSwatchStyle } from '~/utils/project-color-styles'
import type { ProjectColors } from '~~/shared/worklog'
import { PROJECT_COLOR_PALETTE } from '~~/shared/worklog'

const props = defineProps({
  colorValidationMessages: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  heading: { type: String, required: true },
  isSaving: { type: Boolean, default: false },
  name: { type: String, required: true },
  notes: { type: String, required: true },
  primaryColor: { type: String, required: true },
  secondaryColor: { type: String, required: true },
  showInlineActions: { type: Boolean, default: true },
  showArchiveToggle: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  submitLabel: { type: String, required: true },
})

const emit = defineEmits<{
  'apply-palette': [colors: ProjectColors]
  cancel: []
  'clear-error': []
  save: []
  'update:name': [value: string]
  'update:notes': [value: string]
  'update:primary-color': [value: string]
  'update:secondary-color': [value: string]
  'update:archived': [value: boolean]
}>()

const updateName = (event: Event) => {
  emit('update:name', (event.target as HTMLInputElement).value)
  emit('clear-error')
}

const updateNotes = (event: Event) => {
  emit('update:notes', (event.target as HTMLTextAreaElement).value)
  emit('clear-error')
}

const updatePrimaryColor = (event: Event) => {
  emit('update:primary-color', (event.target as HTMLInputElement).value)
  emit('clear-error')
}

const updateSecondaryColor = (event: Event) => {
  emit('update:secondary-color', (event.target as HTMLInputElement).value)
  emit('clear-error')
}

const toggleArchived = () => {
  emit('update:archived', !props.archived)
  emit('clear-error')
}

const draftProjectColors = computed<ProjectColors>(() => ({
  primary: props.primaryColor,
  secondary: props.secondaryColor,
}))

const projectGradientPreviewStyle = computed(() =>
  getProjectPickerOptionStyle(draftProjectColors.value, true),
)

const gradientPreviewTitle = computed(() => props.name.trim() || 'Untitled project')
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-6">
    <ContainerCard as="section" class="w-full rounded-3xl" padding="comfortable">
      <div class="mb-6" data-test="project-editor-heading">
        <h1 class="text-2xl font-bold text-text">{{ heading }}</h1>
      </div>

      <div class="flex flex-col gap-5">
        <AppField label="Name">
          <AppTextInput
            density="comfortable"
            :value="name"
            type="text"
            placeholder=""
            @input="updateName"
          />
        </AppField>

        <div data-test="project-editor-notes">
          <AppField label="Internal notes">
            <AppTextarea
              density="comfortable"
              :value="notes"
              rows="8"
              placeholder="Reference notes, goals, reminders, or project context"
              @input="updateNotes"
            ></AppTextarea>
          </AppField>
        </div>

        <div
          v-if="showArchiveToggle"
          class="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-muted px-4 py-3"
        >
          <label class="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              class="mt-1 size-4 shrink-0 cursor-pointer rounded border-input-border text-link"
              :checked="archived"
              @change="toggleArchived"
            />
            <span class="min-w-0">
              <AppFieldLabel>Archived</AppFieldLabel>
              <span class="mt-1 block text-sm text-text-muted">
                Hides this project from session pickers and desktop tray shortcut lists. It still
                appears in history, reports, and project pages until you change that behavior.
              </span>
            </span>
          </label>
        </div>

        <div
          v-if="showInlineActions"
          data-test="project-editor-inline-actions"
          class="flex justify-end gap-3 pt-2"
        >
          <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
          <AppButton variant="primary" :disabled="isSaving" @click="emit('save')">
            {{ isSaving ? 'Saving...' : submitLabel }}
          </AppButton>
        </div>
      </div>
    </ContainerCard>

    <ContainerCard as="section" class="w-full rounded-3xl" padding="comfortable">
      <div class="flex min-w-0 flex-col gap-4">
        <div
          v-if="colorValidationMessages.length === 0"
          class="flex min-h-[4.5rem] w-full min-w-0 items-center rounded-2xl border border-solid px-4 py-4 shadow-panel-selected sm:min-h-[5rem] sm:px-5"
          data-test="project-editor-gradient-preview"
          role="img"
          :aria-label="`Gradient preview for ${gradientPreviewTitle}`"
          :style="projectGradientPreviewStyle"
        >
          <span class="min-w-0 truncate text-base font-medium">{{ gradientPreviewTitle }}</span>
        </div>

        <ContainerCard
          v-else
          class="rounded-2xl py-3 text-sm"
          data-test="project-editor-color-rules"
          padding="default"
          variant="danger"
        >
          <div class="flex flex-col gap-1">
            <div class="font-semibold text-danger">Color rules block saving</div>
            <ul class="list-disc pl-5 text-text">
              <li v-for="message in colorValidationMessages" :key="message" class="leading-6">
                {{ message }}
              </li>
            </ul>
          </div>
        </ContainerCard>

        <div class="grid w-full min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-6">
          <AppField label="Primary color" class="min-w-0">
            <template #hint>
              <p class="text-sm text-text-muted">
                Badges always use white text, so the primary color has to stay dark enough for that
                to read cleanly.
              </p>
            </template>
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="h-10 w-14 shrink-0 overflow-hidden rounded-xl border border-input-border bg-surface focus-within:ring-2 focus-within:ring-link focus-within:ring-offset-2 focus-within:outline-none"
              >
                <input
                  :value="primaryColor"
                  type="color"
                  class="project-editor-native-color block h-full w-full cursor-pointer outline-none"
                  aria-label="Primary color"
                  @input="updatePrimaryColor"
                />
              </div>
              <input
                :value="primaryColor"
                type="text"
                class="min-h-10 min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 font-data text-text"
                placeholder="#2563eb"
                @input="updatePrimaryColor"
              />
            </div>
          </AppField>

          <AppField label="Secondary color" class="min-w-0">
            <template #hint>
              <p class="text-sm text-text-muted">
                Project gradients use one shared text color. Pick a secondary that keeps that text
                readable across the full gradient.
              </p>
            </template>
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="h-10 w-14 shrink-0 overflow-hidden rounded-xl border border-input-border bg-surface focus-within:ring-2 focus-within:ring-link focus-within:ring-offset-2 focus-within:outline-none"
              >
                <input
                  :value="secondaryColor"
                  type="color"
                  class="project-editor-native-color block h-full w-full cursor-pointer outline-none"
                  aria-label="Secondary color"
                  @input="updateSecondaryColor"
                />
              </div>
              <input
                :value="secondaryColor"
                type="text"
                class="min-h-10 min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 font-data text-text"
                placeholder="#0e7490"
                @input="updateSecondaryColor"
              />
            </div>
          </AppField>
        </div>

        <div class="flex flex-col gap-2">
          <AppFieldLabel>Palette presets</AppFieldLabel>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="(palette, index) in PROJECT_COLOR_PALETTE"
              :key="`${palette.primary}-${palette.secondary}`"
              type="button"
              class="size-9 shrink-0 cursor-pointer rounded-full border border-overlay-border-strong shadow-control transition-[box-shadow,filter] duration-150 ease-out hover:shadow-[var(--shadow-panel)] hover:brightness-[1.05] focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
              :style="getProjectSwatchStyle(palette)"
              :aria-label="`Apply color preset ${index + 1}`"
              :title="`${palette.primary} / ${palette.secondary}`"
              @click="emit('apply-palette', palette)"
            />
          </div>
        </div>
      </div>
    </ContainerCard>
  </div>
</template>

<style scoped>
/* Flush native color swatch to the rounded frame (removes default inner padding). */
.project-editor-native-color {
  appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
}

.project-editor-native-color::-webkit-color-swatch-wrapper {
  padding: 0;
}

.project-editor-native-color::-webkit-color-swatch {
  border: none;
  border-radius: 0.75rem;
}

.project-editor-native-color::-moz-color-swatch {
  border: none;
  border-radius: 0.75rem;
}
</style>
