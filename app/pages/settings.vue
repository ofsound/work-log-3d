<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { signOut } from 'firebase/auth'
import { useCollection } from 'vuefire'
import {
  definePageMeta,
  useCurrentUser,
  useFirebaseAuth,
  useRouter,
  useRuntimeConfig,
} from '#imports'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useHostRuntime } from '~/composables/useHostRuntime'
import { useUserSettings } from '~/composables/useUserSettings'
import { toProjects, toTags } from '~/utils/worklog-firebase'
import { USER_SETTINGS_BACKGROUND_OPTIONS } from '~/utils/user-settings'

import type { FirebaseProjectDocument, FirebaseTagDocument } from '~/utils/worklog-firebase'
import type {
  DesktopAlertSoundState,
  UserSettings,
  UserSettingsTrayShortcut,
  UserSettingsTrayShortcutTimerMode,
} from '~~/shared/worklog'
import {
  areUserSettingsEqual,
  cloneUserSettings,
  getWorklogErrorMessage,
  sortNamedEntities,
} from '~~/shared/worklog'

definePageMeta({ layout: 'main-workspace' })

const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const auth = useFirebaseAuth()
const { desktopApi, isDesktop } = useHostRuntime()
const { projectsCollection, tagsCollection } = useFirestoreCollections()
const { applyPreview, clearPreview, defaultSettings, saveSettings, savedSettings } =
  useUserSettings()
const currentUser = useCurrentUser()
const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const draft = ref<UserSettings>(cloneUserSettings(savedSettings.value))
const mutationErrorMessage = ref('')
const saveMessage = ref('')
const isSaving = ref(false)
const hasInitializedDraft = ref(false)

const desktopAlertState = ref<DesktopAlertSoundState | null>(null)
const desktopAlertMessage = ref('')
const isLoadingDesktopAlert = ref(false)
const isMutatingDesktopAlert = ref(false)
/** Avoid SSR/client hydration mismatch: auth user ref can differ before mount. */
const isAccountUiReady = ref(false)

const isDirty = computed(() => !areUserSettingsEqual(draft.value, savedSettings.value))
const hasCustomDesktopAlertSound = computed(() => desktopAlertState.value?.source === 'custom')
const sortedProjects = computed(() =>
  sortNamedEntities(toProjects((allProjects.value as FirebaseProjectDocument[] | undefined) ?? [])),
)
const trayShortcutProjectOptions = computed(() => sortedProjects.value.filter((p) => !p.archived))
const sortedTags = computed(() =>
  sortNamedEntities(toTags((allTags.value as FirebaseTagDocument[] | undefined) ?? [])),
)

const accountDisplayName = computed(() => {
  const u = currentUser.value
  if (u === undefined || u === null) {
    return null
  }
  return u.displayName?.trim() || null
})

const accountEmail = computed(() => currentUser.value?.email ?? null)
const accountPhotoUrl = computed(() => currentUser.value?.photoURL ?? null)
const accountUid = computed(() => currentUser.value?.uid ?? null)

const syncDraftFromSaved = (settings: UserSettings) => {
  draft.value = cloneUserSettings(settings)
}

/** Plain JSON so Electron IPC can structured-clone (Vue proxies are not clone-safe). */
const cloneTrayShortcutsForDesktop = (
  shortcuts: UserSettingsTrayShortcut[],
): UserSettingsTrayShortcut[] => JSON.parse(JSON.stringify(shortcuts))

const createTrayShortcutId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `tray-shortcut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const createTrayShortcut = (): UserSettingsTrayShortcut => ({
  id: createTrayShortcutId(),
  label: '',
  timerMode: 'countup',
  durationMinutes: null,
  project: '',
  tags: [],
})

const clearMessages = () => {
  mutationErrorMessage.value = ''
  saveMessage.value = ''
}

const addTrayShortcut = () => {
  draft.value.desktop.trayShortcuts = [...draft.value.desktop.trayShortcuts, createTrayShortcut()]
  clearMessages()
}

const removeTrayShortcut = (shortcutId: string) => {
  draft.value.desktop.trayShortcuts = draft.value.desktop.trayShortcuts.filter(
    (shortcut) => shortcut.id !== shortcutId,
  )
  clearMessages()
}

const moveTrayShortcut = (index: number, direction: -1 | 1) => {
  const nextIndex = index + direction

  if (nextIndex < 0 || nextIndex >= draft.value.desktop.trayShortcuts.length) {
    return
  }

  const nextShortcuts = [...draft.value.desktop.trayShortcuts]
  const currentShortcut = nextShortcuts[index]!
  nextShortcuts[index] = nextShortcuts[nextIndex]!
  nextShortcuts[nextIndex] = currentShortcut
  draft.value.desktop.trayShortcuts = nextShortcuts
  clearMessages()
}

const setTrayShortcutTimerMode = (
  shortcut: UserSettingsTrayShortcut,
  timerMode: UserSettingsTrayShortcutTimerMode,
) => {
  shortcut.timerMode = timerMode
  shortcut.durationMinutes = timerMode === 'countdown' ? (shortcut.durationMinutes ?? 30) : null
  clearMessages()
}

const handleTrayShortcutDurationInput = (shortcut: UserSettingsTrayShortcut, event: Event) => {
  const value = Number.parseInt((event.target as HTMLInputElement).value, 10)
  shortcut.durationMinutes = Number.isFinite(value) ? value : null
  clearMessages()
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

const handleResetFontsToDefaults = () => {
  draft.value.appearance.fontImportUrl = defaultSettings.appearance.fontImportUrl
  draft.value.appearance.fontFamilies = {
    ui: defaultSettings.appearance.fontFamilies.ui,
    data: defaultSettings.appearance.fontFamilies.data,
    script: defaultSettings.appearance.fontFamilies.script,
  }
  mutationErrorMessage.value = ''
  saveMessage.value = ''
}

async function handleSignOut() {
  if (auth) {
    await signOut(auth)
    await router.push('/login')
  }
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
  () => savedSettings.value.desktop.trayShortcuts,
  (shortcuts) => {
    if (!isDesktop || !desktopApi) {
      return
    }

    void desktopApi.setTrayShortcuts(cloneTrayShortcutsForDesktop(shortcuts)).catch((error) => {
      console.warn('[worklog] unable to sync tray shortcuts', error)
    })
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
    if (isDirty.value) {
      mutationErrorMessage.value = ''
      saveMessage.value = ''
    }
  },
  {
    deep: true,
    immediate: true,
  },
)

onMounted(() => {
  isAccountUiReady.value = true
  void loadDesktopAlertState()
})

onBeforeUnmount(() => {
  clearPreview()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
    <aside
      class="flex w-full shrink-0 flex-col overflow-hidden border-b border-border-subtle bg-surface/96 backdrop-blur max-lg:max-h-[min(50vh,26rem)] lg:h-full lg:max-h-none lg:w-[400px] lg:border-r lg:border-b-0"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-12 pb-6">
          <h1 class="text-3xl font-bold text-text">User Settings</h1>
          <ContainerCard class="mt-4" padding="compact" variant="muted" aria-live="polite">
            <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">Account</div>

            <p
              v-if="!isAccountUiReady || currentUser === undefined"
              class="mt-2 text-sm text-text-muted"
            >
              Loading account…
            </p>

            <div v-else-if="accountUid" class="mt-3 flex gap-4">
              <img
                v-if="accountPhotoUrl"
                :src="accountPhotoUrl"
                alt=""
                class="h-12 w-12 shrink-0 rounded-full border border-border-subtle bg-surface object-cover"
                referrerpolicy="no-referrer"
              />
              <div class="min-w-0 flex-1">
                <div v-if="accountDisplayName" class="font-semibold text-text">
                  {{ accountDisplayName }}
                </div>
                <div
                  v-if="accountEmail"
                  class="flex flex-wrap items-center justify-between gap-2"
                  :class="accountDisplayName ? 'mt-0.5' : ''"
                >
                  <div
                    class="min-w-0 text-sm"
                    :class="accountDisplayName ? 'text-text-muted' : 'font-semibold text-text'"
                  >
                    {{ accountEmail }}
                  </div>
                  <button
                    type="button"
                    class="shrink-0 cursor-pointer text-sm font-semibold text-link underline hover:text-link-hover"
                    @click="handleSignOut"
                  >
                    Sign out
                  </button>
                </div>
                <div
                  v-else-if="accountDisplayName"
                  class="mt-2 flex flex-wrap items-center justify-end gap-2"
                >
                  <button
                    type="button"
                    class="shrink-0 cursor-pointer text-sm font-semibold text-link underline hover:text-link-hover"
                    @click="handleSignOut"
                  >
                    Sign out
                  </button>
                </div>
                <div v-else class="flex flex-wrap items-center justify-between gap-2">
                  <div class="text-sm font-semibold text-text">Signed-in user</div>
                  <button
                    type="button"
                    class="shrink-0 cursor-pointer text-sm font-semibold text-link underline hover:text-link-hover"
                    @click="handleSignOut"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>

            <p v-else class="mt-2 text-sm text-text-muted">No user is signed in.</p>
          </ContainerCard>

          <ContainerCard as="section" class="mt-4">
            <div class="flex flex-col gap-2">
              <div class="flex gap-2">
                <AppButton class="min-w-0 flex-1" variant="secondary" @click="handleCancel">
                  Cancel
                </AppButton>
                <AppButton
                  class="min-w-0 flex-1"
                  variant="primary"
                  :disabled="!isDirty || isSaving"
                  @click="handleSave"
                >
                  {{ isSaving ? 'Saving…' : 'Save changes' }}
                </AppButton>
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
          </ContainerCard>
        </div>
        <p class="shrink-0 px-6 pb-6 text-center text-xs text-text-subtle">
          Work Log {{ runtimeConfig.public.appVersion }}
        </p>
      </div>
    </aside>

    <div
      class="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 overflow-auto overscroll-contain px-6 pt-12 pb-6"
    >
      <ContainerCard as="section">
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div class="flex flex-col gap-4">
            <AppField label="Google Fonts import">
              <AppTextInput
                v-model="draft.appearance.fontImportUrl"
                placeholder="https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap"
              />
              <template #hint>
                <span class="text-xs text-text-subtle">
                  Paste either a raw `https://fonts.googleapis.com/css2...` URL or a full `@import
                  url(...)` rule.
                </span>
              </template>
            </AppField>

            <div class="grid gap-4 md:grid-cols-3">
              <AppField label="UI font family">
                <AppTextInput
                  v-model="draft.appearance.fontFamilies.ui"
                  placeholder="'National Park', sans-serif"
                />
              </AppField>
              <AppField label="Data font family">
                <AppTextInput
                  v-model="draft.appearance.fontFamilies.data"
                  placeholder="'Lato', sans-serif"
                />
              </AppField>
              <AppField label="Script font family">
                <AppTextInput
                  v-model="draft.appearance.fontFamilies.script"
                  placeholder="'Caveat', sans-serif"
                />
              </AppField>
            </div>

            <AppButton class="self-start" variant="secondary" @click="handleResetFontsToDefaults">
              Reset fonts to defaults
            </AppButton>
          </div>

          <ContainerCard padding="compact" variant="muted">
            <AppFieldLabel as="div">Live font preview</AppFieldLabel>
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
          </ContainerCard>
        </div>

        <div class="mt-6">
          <AppFieldLabel as="div">Background style</AppFieldLabel>
          <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label
              v-for="option in USER_SETTINGS_BACKGROUND_OPTIONS"
              :key="option.id"
              class="flex flex-col gap-3"
            >
              <ContainerCard
                as="div"
                flat-surface
                padding="compact"
                :interactive="draft.appearance.backgroundPreset !== option.id"
                :selected="draft.appearance.backgroundPreset === option.id"
                :variant="draft.appearance.backgroundPreset === option.id ? 'muted' : 'default'"
                class="flex h-full cursor-pointer items-center justify-between gap-3"
              >
                <span class="font-semibold text-text">{{ option.label }}</span>
                <input
                  v-model="draft.appearance.backgroundPreset"
                  type="radio"
                  :value="option.id"
                  class="shrink-0"
                />
              </ContainerCard>
            </label>
          </div>
        </div>

        <div class="mt-6">
          <AppFieldLabel as="div">Project-only mode</AppFieldLabel>
          <div class="mt-3">
            <label class="block">
              <ContainerCard class="flex items-start gap-4" padding="compact" variant="muted">
                <input v-model="draft.workflow.hideTags" type="checkbox" class="mt-1" />
                <div>
                  <div class="font-semibold text-text">Hide tags across the authenticated app</div>
                  <p class="mt-2 text-sm leading-6 text-text-muted">
                    Removes tag navigation, filters, badges, editors, and tag report controls while
                    preserving any existing tag data already attached to sessions and reports.
                  </p>
                </div>
              </ContainerCard>
            </label>
          </div>
        </div>
      </ContainerCard>

      <ContainerCard as="section">
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Desktop app</div>

        <ContainerCard
          v-if="!isDesktop"
          class="mt-5 border-dashed py-5 text-sm leading-6 text-text-muted shadow-none"
          padding="compact"
          variant="muted"
        >
          Open the desktop app to import a local sound file or manage tray shortcuts.
        </ContainerCard>

        <div v-else class="mt-5 flex flex-col gap-6">
          <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <AppFieldLabel as="div">Timer completion sound</AppFieldLabel>
              <p class="text-sm leading-6 text-text-muted">
                Choose the sound this device plays when a countdown completes.
              </p>
            </div>

            <ContainerCard padding="compact" variant="muted">
              <AppFieldLabel as="div">Current sound</AppFieldLabel>
              <div class="mt-2 text-text">
                {{
                  isLoadingDesktopAlert
                    ? 'Loading…'
                    : desktopAlertState?.fileName || 'timer-complete.wav'
                }}
              </div>
              <div class="mt-1 text-sm text-text-muted">
                {{
                  hasCustomDesktopAlertSound
                    ? 'Imported on this device and copied into app storage.'
                    : 'Using the bundled default alert sound.'
                }}
              </div>
            </ContainerCard>

            <div class="flex flex-wrap gap-2">
              <AppButton
                variant="primary"
                :disabled="isLoadingDesktopAlert || isMutatingDesktopAlert"
                @click="
                  runDesktopAlertAction(
                    () => desktopApi!.chooseAlertSound(),
                    'Desktop alert sound updated.',
                  )
                "
              >
                Choose file
              </AppButton>
              <AppButton
                variant="secondary"
                :disabled="isLoadingDesktopAlert || isMutatingDesktopAlert"
                @click="
                  runDesktopAlertAction(
                    () => desktopApi!.testAlertSound().then(() => undefined),
                    'Playing alert sound…',
                  )
                "
              >
                Test sound
              </AppButton>
              <AppButton
                variant="secondary"
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
              </AppButton>
            </div>

            <div class="text-sm text-text-muted">Supported file types: mp3, wav, aiff.</div>
            <p v-if="desktopAlertMessage" class="text-sm text-text-muted">
              {{ desktopAlertMessage }}
            </p>
          </section>

          <section class="flex flex-col gap-4 border-t border-border-subtle pt-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <AppFieldLabel as="div">Tray menu shortcuts</AppFieldLabel>
                <p class="mt-1 text-sm leading-6 text-text-muted">
                  Add desktop-only shortcuts that appear alongside Pomodoro and Start Timer. Each
                  shortcut can start count up or countdown and open `/new` with a project and tags
                  preselected.
                </p>
              </div>
              <AppButton variant="primary" @click="addTrayShortcut">Add shortcut</AppButton>
            </div>

            <ContainerCard
              v-if="draft.desktop.trayShortcuts.length === 0"
              class="py-5 text-sm text-text-muted shadow-none"
              padding="compact"
              variant="muted"
            >
              No custom tray shortcuts yet.
            </ContainerCard>

            <ContainerCard
              v-for="(shortcut, index) in draft.desktop.trayShortcuts"
              :key="shortcut.id"
              class="flex flex-col gap-4"
              padding="compact"
              variant="muted"
            >
              <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div class="grid flex-1 gap-4 lg:grid-cols-2">
                  <AppField label="Label" label-variant="meta">
                    <AppTextInput v-model="shortcut.label" placeholder="Deep work" />
                  </AppField>

                  <fieldset class="flex flex-col gap-2">
                    <AppFieldLabel as="legend" variant="meta">Timer</AppFieldLabel>
                    <div class="flex flex-wrap gap-2.5">
                      <AppToggleChip :selected="shortcut.timerMode === 'countup'">
                        <input
                          :checked="shortcut.timerMode === 'countup'"
                          :name="`trayShortcutMode-${shortcut.id}`"
                          type="radio"
                          @change="setTrayShortcutTimerMode(shortcut, 'countup')"
                        />
                        <span>Count up</span>
                      </AppToggleChip>
                      <AppToggleChip :selected="shortcut.timerMode === 'countdown'">
                        <input
                          :checked="shortcut.timerMode === 'countdown'"
                          :name="`trayShortcutMode-${shortcut.id}`"
                          type="radio"
                          @change="setTrayShortcutTimerMode(shortcut, 'countdown')"
                        />
                        <span>Countdown</span>
                      </AppToggleChip>
                    </div>
                  </fieldset>

                  <AppField
                    v-if="shortcut.timerMode === 'countdown'"
                    label="Countdown minutes"
                    label-variant="meta"
                  >
                    <AppTextInput
                      :value="shortcut.durationMinutes ?? ''"
                      min="1"
                      step="1"
                      type="number"
                      placeholder="30"
                      @input="handleTrayShortcutDurationInput(shortcut, $event)"
                    />
                  </AppField>

                  <AppField label="Project" label-variant="meta">
                    <AppSelect v-model="shortcut.project">
                      <option value="">No project preselected</option>
                      <option
                        v-for="project in trayShortcutProjectOptions"
                        :key="project.id"
                        :value="project.id"
                      >
                        {{ project.name }}
                      </option>
                    </AppSelect>
                  </AppField>
                </div>

                <div class="flex flex-wrap gap-2">
                  <AppButton
                    variant="secondary"
                    :disabled="index === 0"
                    @click="moveTrayShortcut(index, -1)"
                  >
                    Move up
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    :disabled="index === draft.desktop.trayShortcuts.length - 1"
                    @click="moveTrayShortcut(index, 1)"
                  >
                    Move down
                  </AppButton>
                  <AppButton variant="danger" @click="removeTrayShortcut(shortcut.id)">
                    Remove
                  </AppButton>
                </div>
              </div>

              <div class="flex flex-col gap-3 border-t border-border-subtle pt-4">
                <div class="flex flex-col gap-1">
                  <AppFieldLabel as="div">Tags</AppFieldLabel>
                  <p class="text-xs text-text-muted">
                    Tags apply when this shortcut opens the new session form.
                  </p>
                </div>

                <div v-if="sortedTags.length" class="flex flex-wrap gap-2.5">
                  <AppToggleChip
                    v-for="tag in sortedTags"
                    :key="tag.id"
                    :selected="shortcut.tags.includes(tag.id)"
                  >
                    <input v-model="shortcut.tags" type="checkbox" :value="tag.id" />
                    <span>{{ tag.name }}</span>
                  </AppToggleChip>
                </div>

                <p v-else class="text-sm text-text-muted">
                  No tags available yet. Create tags first if you want to prefill them from tray
                  shortcuts.
                </p>
              </div>
            </ContainerCard>
          </section>
        </div>
      </ContainerCard>
    </div>
  </div>
</template>
