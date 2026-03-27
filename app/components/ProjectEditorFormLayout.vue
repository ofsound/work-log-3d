<script setup lang="ts">
import type { PropType } from 'vue'

import { getProjectSwatchStyle } from '~/utils/project-color-styles'
import type { ProjectColors } from '~~/shared/worklog'
import { PROJECT_COLOR_PALETTE } from '~~/shared/worklog'

const props = defineProps({
  heading: { type: String, required: true },
  isSaving: { type: Boolean, default: false },
  lowContrastWarning: { type: Boolean, default: false },
  name: { type: String, required: true },
  notes: { type: String, required: true },
  previewBadgeStyle: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
  previewHeaderStyle: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
  previewNotesFallback: { type: String, default: 'Notes remain private to the edit page for now.' },
  previewSurfaceStyle: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
  primaryColor: { type: String, required: true },
  secondaryColor: { type: String, required: true },
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
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-6">
    <ContainerCard as="section" class="w-full rounded-3xl" padding="comfortable">
      <div class="mb-6">
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

        <AppField label="Internal notes">
          <AppTextarea
            density="comfortable"
            :value="notes"
            rows="8"
            placeholder="Reference notes, goals, reminders, or project context"
            @input="updateNotes"
          ></AppTextarea>
        </AppField>

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
          class="grid w-full min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        >
          <div class="flex min-w-0 flex-col gap-4">
            <div class="grid w-full min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-6">
              <AppField label="Primary color" class="min-w-0">
                <div
                  class="flex items-center gap-3 rounded-2xl border border-input-border bg-input px-3 py-3"
                >
                  <input
                    :value="primaryColor"
                    type="color"
                    class="h-10 w-14 cursor-pointer rounded-lg border border-input-border bg-transparent"
                    @input="updatePrimaryColor"
                  />
                  <input
                    :value="primaryColor"
                    type="text"
                    class="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 font-data text-text"
                    placeholder="#2563eb"
                    @input="updatePrimaryColor"
                  />
                </div>
              </AppField>

              <AppField label="Secondary color" class="min-w-0">
                <div
                  class="flex items-center gap-3 rounded-2xl border border-input-border bg-input px-3 py-3"
                >
                  <input
                    :value="secondaryColor"
                    type="color"
                    class="h-10 w-14 cursor-pointer rounded-lg border border-input-border bg-transparent"
                    @input="updateSecondaryColor"
                  />
                  <input
                    :value="secondaryColor"
                    type="text"
                    class="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 font-data text-text"
                    placeholder="#06b6d4"
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

          <section class="flex min-w-0 flex-col gap-4">
            <div class="min-w-0 px-5 py-5">
              <ContainerCard
                class="overflow-hidden rounded-3xl border-overlay-border bg-surface p-0"
                padding="compact"
                variant="overlay"
              >
                <div class="px-5 py-5" :style="previewHeaderStyle">
                  <div class="text-xs tracking-[0.18em] uppercase opacity-80">Project header</div>
                  <div class="mt-2 text-2xl font-bold">
                    {{ name.trim() || 'Project preview' }}
                  </div>
                </div>
                <div class="flex flex-col gap-4 px-5 py-5">
                  <div class="flex flex-wrap items-center gap-2">
                    <div
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :style="previewBadgeStyle"
                    >
                      Example badge
                    </div>
                    <div
                      class="rounded-full border px-3 py-1 text-xs font-semibold text-text"
                      :style="previewSurfaceStyle"
                    >
                      Subtle project surface
                    </div>
                  </div>
                  <p class="text-sm text-text-muted">
                    {{ notes.trim() || previewNotesFallback }}
                  </p>
                </div>
              </ContainerCard>
            </div>
          </section>
        </div>

        <ContainerCard
          v-if="lowContrastWarning"
          class="rounded-3xl py-4 text-sm"
          padding="default"
          variant="warning"
        >
          This color pairing may reduce contrast in some project surfaces. The preview keeps the
          current choice, but you may want more separation between the two colors.
        </ContainerCard>

        <div class="flex justify-end gap-3 pt-2">
          <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
          <AppButton variant="primary" :disabled="isSaving" @click="emit('save')">
            {{ isSaving ? 'Saving...' : submitLabel }}
          </AppButton>
        </div>
      </div>
    </ContainerCard>
  </div>
</template>
