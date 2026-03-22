<script setup lang="ts">
import type { DesktopAlertSoundState, UserSettings } from '~~/shared/worklog'
import { areUserSettingsEqual, cloneUserSettings, getWorklogErrorMessage } from '~~/shared/worklog'

import {
  getUserSettingsBackgroundOption,
  USER_SETTINGS_BACKGROUND_OPTIONS,
} from '~/utils/user-settings'

const { desktopApi, isDesktop } = useHostRuntime()
const { applyPreview, clearPreview, defaultSettings, saveSettings, savedSettings } =
  useUserSettings()

const draft = ref<UserSettings>(cloneUserSettings(savedSettings.value))
const mutationErrorMessage = ref('')
const saveMessage = ref('')
const isSaving = ref(false)
const hasInitializedDraft = ref(false)

const desktopAlertState = ref<DesktopAlertSoundState | null>(null)
const desktopAlertMessage = ref('')
const isLoadingDesktopAlert = ref(false)
const isMutatingDesktopAlert = ref(false)

const isDirty = computed(() => !areUserSettingsEqual(draft.value, savedSettings.value))
const hasCustomDesktopAlertSound = computed(() => desktopAlertState.value?.source === 'custom')

const syncDraftFromSaved = (settings: UserSettings) => {
  draft.value = cloneUserSettings(settings)
}

const loadDesktopAlertState = async () => {
  if (!isDesktop || !desktopApi) {
    desktopAlertState.value = null
    return
  }

  isLoadingDesktopAlert.value = true

  try {
    desktopAlertState.value = await desktopApi.getAlertSound()
    desktopAlertMessage.value = ''
  } catch (error) {
    desktopAlertMessage.value = getWorklogErrorMessage(
      error,
      'Unable to load the desktop alert sound.',
    )
  } finally {
    isLoadingDesktopAlert.value = false
  }
}

const runDesktopAlertAction = async (
  action: () => Promise<DesktopAlertSoundState | undefined>,
  successMessage = '',
) => {
  if (!desktopApi) {
    return
  }

  isMutatingDesktopAlert.value = true

  try {
    const nextState = await action()
    if (nextState) {
      desktopAlertState.value = nextState
    }
    desktopAlertMessage.value = successMessage
  } catch (error) {
    desktopAlertMessage.value = getWorklogErrorMessage(
      error,
      'Unable to update the desktop alert sound.',
    )
  } finally {
    isMutatingDesktopAlert.value = false
  }
}

const handleSave = async () => {
  isSaving.value = true

  try {
    mutationErrorMessage.value = ''
    await saveSettings(draft.value)
    saveMessage.value = 'Settings saved.'
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save settings.')
    saveMessage.value = ''
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  syncDraftFromSaved(savedSettings.value)
  mutationErrorMessage.value = ''
  saveMessage.value = ''
}

const handleResetToDefaults = () => {
  draft.value = cloneUserSettings(defaultSettings)
  mutationErrorMessage.value = ''
  saveMessage.value = ''
}

watch(
  savedSettings,
  (nextSettings) => {
    if (!hasInitializedDraft.value || !isDirty.value) {
      syncDraftFromSaved(nextSettings)
    }

    hasInitializedDraft.value = true
  },
  {
    deep: true,
    immediate: true,
  },
)

watch(
  draft,
  (nextSettings) => {
    applyPreview(nextSettings)
    mutationErrorMessage.value = ''
    saveMessage.value = ''
  },
  {
    deep: true,
    immediate: true,
  },
)

onMounted(() => {
  void loadDesktopAlertState()
})

onBeforeUnmount(() => {
  clearPreview()
})
</script>

<template>
  <div class="h-full overflow-auto px-6 pt-6 pb-6">
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
      <section class="rounded-2xl border border-border-subtle bg-surface px-5 py-5 shadow-panel">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Settings</div>
            <h1 class="mt-1 text-3xl font-bold text-text">Personal workspace</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
              Appearance and workflow preferences sync with your account. Desktop alert sounds stay
              local to each Electron install.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="handleResetToDefaults"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg bg-button-primary px-3 py-2 text-sm font-semibold text-button-primary-text shadow-button-primary hover:bg-button-primary-hover disabled:opacity-50"
              :disabled="!isDirty || isSaving"
              @click="handleSave"
            >
              {{ isSaving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </div>

        <div
          v-if="saveMessage"
          class="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text"
        >
          {{ saveMessage }}
        </div>
        <p v-if="mutationErrorMessage" class="mt-4 text-sm text-danger">
          {{ mutationErrorMessage }}
        </p>
      </section>

      <section class="rounded-2xl border border-border-subtle bg-surface px-5 py-5 shadow-panel">
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Appearance</div>
        <h2 class="mt-1 text-2xl font-bold text-text">Fonts and shell</h2>
        <div class="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div class="flex flex-col gap-4">
            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-text">Google Fonts import</span>
              <input
                v-model="draft.appearance.fontImportUrl"
                class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                placeholder="https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap"
              />
              <span class="text-xs text-text-subtle">
                Paste either a raw `https://fonts.googleapis.com/css2...` URL or a full `@import
                url(...)` rule.
              </span>
            </label>

            <div class="grid gap-4 md:grid-cols-3">
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">UI font family</span>
                <input
                  v-model="draft.appearance.fontFamilies.ui"
                  class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  placeholder="'National Park', sans-serif"
                />
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">Data font family</span>
                <input
                  v-model="draft.appearance.fontFamilies.data"
                  class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  placeholder="'Lato', sans-serif"
                />
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">Script font family</span>
                <input
                  v-model="draft.appearance.fontFamilies.script"
                  class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  placeholder="'Caveat', sans-serif"
                />
              </label>
            </div>
          </div>

          <div class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4">
            <div class="text-sm font-semibold text-text">Live font preview</div>
            <div class="mt-4 flex flex-col gap-4">
              <div>
                <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">UI</div>
                <div class="mt-2 text-2xl text-text">
                  Settings should feel personal, but still readable at a glance.
                </div>
              </div>
              <div>
                <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">Data</div>
                <div class="mt-2 font-data text-3xl font-bold text-text tabular-nums">
                  03:45 · 128.4 hrs
                </div>
              </div>
              <div>
                <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">Script</div>
                <div class="mt-2 font-script text-4xl text-text">Daily rhythm</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <div class="text-sm font-semibold text-text">Background style</div>
          <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label
              v-for="option in USER_SETTINGS_BACKGROUND_OPTIONS"
              :key="option.id"
              class="flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition"
              :class="
                draft.appearance.backgroundPreset === option.id
                  ? 'border-border-strong bg-surface-subtle shadow-control'
                  : 'border-border-subtle bg-surface hover:border-border'
              "
            >
              <div class="flex items-center justify-between gap-3">
                <div class="font-semibold text-text">{{ option.label }}</div>
                <input
                  v-model="draft.appearance.backgroundPreset"
                  type="radio"
                  :value="option.id"
                />
              </div>
              <div class="text-sm leading-6 text-text-muted">
                {{ option.description }}
              </div>
              <div class="rounded-xl bg-surface-muted px-3 py-3 text-xs text-text-subtle">
                {{ getUserSettingsBackgroundOption(option.id).label }}
              </div>
            </label>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-border-subtle bg-surface px-5 py-5 shadow-panel">
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Desktop Alerts</div>
        <h2 class="mt-1 text-2xl font-bold text-text">Timer completion sound</h2>

        <div
          v-if="!isDesktop"
          class="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-5 text-sm leading-6 text-text-muted"
        >
          Custom alert sounds are available in the Electron app. Open the desktop app on this device
          to import, clear, or test a local sound file.
        </div>

        <div v-else class="mt-5 flex flex-col gap-4">
          <div class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4">
            <div class="text-sm font-semibold text-text">Current sound</div>
            <div class="mt-2 text-text">
              {{
                isLoadingDesktopAlert
                  ? 'Loading…'
                  : desktopAlertState?.fileName || 'timer-complete.mp3'
              }}
            </div>
            <div class="mt-1 text-sm text-text-muted">
              {{
                hasCustomDesktopAlertSound
                  ? 'Imported on this device and copied into app storage.'
                  : 'Using the bundled default alert sound.'
              }}
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-lg bg-button-primary px-3 py-2 text-sm font-semibold text-button-primary-text shadow-button-primary hover:bg-button-primary-hover disabled:opacity-50"
              :disabled="isLoadingDesktopAlert || isMutatingDesktopAlert"
              @click="
                runDesktopAlertAction(
                  () => desktopApi!.chooseAlertSound(),
                  'Desktop alert sound updated.',
                )
              "
            >
              Choose file
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover disabled:opacity-50"
              :disabled="isLoadingDesktopAlert || isMutatingDesktopAlert"
              @click="
                runDesktopAlertAction(
                  () => desktopApi!.testAlertSound().then(() => undefined),
                  'Playing alert sound…',
                )
              "
            >
              Test sound
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover disabled:opacity-50"
              :disabled="
                isLoadingDesktopAlert || isMutatingDesktopAlert || !hasCustomDesktopAlertSound
              "
              @click="
                runDesktopAlertAction(
                  () => desktopApi!.clearAlertSound(),
                  'Custom desktop alert cleared.',
                )
              "
            >
              Clear custom sound
            </button>
          </div>

          <div class="text-sm text-text-muted">Supported file types: mp3, wav, aiff.</div>
          <p v-if="desktopAlertMessage" class="text-sm text-text-muted">
            {{ desktopAlertMessage }}
          </p>
        </div>
      </section>

      <section class="rounded-2xl border border-border-subtle bg-surface px-5 py-5 shadow-panel">
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Workflow</div>
        <h2 class="mt-1 text-2xl font-bold text-text">Project-first mode</h2>
        <label
          class="mt-5 flex items-start gap-4 rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4"
        >
          <input v-model="draft.workflow.hideTags" type="checkbox" class="mt-1" />
          <div>
            <div class="font-semibold text-text">Hide tags across the authenticated app</div>
            <p class="mt-2 text-sm leading-6 text-text-muted">
              Removes tag navigation, filters, badges, editors, and tag report controls while
              preserving any existing tag data already attached to sessions and reports.
            </p>
          </div>
        </label>
      </section>
    </div>
  </div>
</template>
