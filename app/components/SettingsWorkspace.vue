<script setup lang="ts">
import { computed } from 'vue'

import { useCollection } from 'vuefire'
import { useRuntimeConfig } from '#imports'

import { useDesktopAlertSettings } from '~/composables/useDesktopAlertSettings'
import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useMediaQuery } from '~/composables/useMediaQuery'
import { useSettingsAccount } from '~/composables/useSettingsAccount'
import { useSettingsDraft } from '~/composables/useSettingsDraft'
import { useTrayShortcutsEditor } from '~/composables/useTrayShortcutsEditor'
import { USER_SETTINGS_BACKGROUND_OPTIONS } from '~/utils/user-settings'
import { BELOW_SM_VIEWPORT_MEDIA_QUERY } from '~/utils/viewport'
import type { FirebaseProjectDocument, FirebaseTagDocument } from '~/utils/worklog-firebase'
import { toProjects, toTags } from '~/utils/worklog-firebase'
import { sortNamedEntities } from '~~/shared/worklog'

const runtimeConfig = useRuntimeConfig()

const { projectsCollection, tagsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)
const isBelowSmViewport = useMediaQuery(BELOW_SM_VIEWPORT_MEDIA_QUERY, false)

const draftState = useSettingsDraft()
const account = useSettingsAccount()
const desktop = useDesktopAlertSettings({
  savedSettings: draftState.savedSettings,
})
const trayShortcuts = useTrayShortcutsEditor({
  clearMessages: draftState.clearMessages,
  draft: draftState.draft,
})

const {
  draft,
  handleCancel,
  handleResetFontsToDefaults,
  handleSave,
  isDirty,
  isSaving,
  mutationErrorMessage,
  saveMessage,
} = draftState
const {
  accountDisplayName,
  accountEmail,
  accountPhotoUrl,
  accountUid,
  currentUser,
  handleSignOut,
  isAccountUiReady,
} = account
const {
  desktopAlertMessage,
  desktopAlertState,
  desktopApi,
  hasCustomDesktopAlertSound,
  isDesktop,
  isLoadingDesktopAlert,
  isMutatingDesktopAlert,
  runDesktopAlertAction,
} = desktop
const {
  addTrayShortcut,
  handleTrayShortcutDurationInput,
  moveTrayShortcut,
  removeTrayShortcut,
  setTrayShortcutTimerMode,
} = trayShortcuts

const sortedProjects = computed(() =>
  sortNamedEntities(toProjects((allProjects.value as FirebaseProjectDocument[] | undefined) ?? [])),
)
const trayShortcutProjectOptions = computed(() => sortedProjects.value.filter((p) => !p.archived))
const sortedTags = computed(() =>
  sortNamedEntities(toTags((allTags.value as FirebaseTagDocument[] | undefined) ?? [])),
)
</script>

<template>
  <WorkspaceSidebarLayout
    :hide-sidebar="isBelowSmViewport"
    content-body-class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-12 pb-6"
    sidebar-body-class="px-6 pt-12 pb-6"
    sidebar-footer-class="px-6 pb-6"
  >
    <template #sidebar>
      <div v-if="!isBelowSmViewport" class="flex min-h-full flex-col">
        <div class="min-h-0 flex-1">
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
      </div>
    </template>

    <template #sidebarFooter>
      <p v-if="!isBelowSmViewport" class="text-center text-xs text-text-subtle">
        Work Log {{ runtimeConfig.public.appVersion }}
      </p>
    </template>

    <template #default>
      <template v-if="isBelowSmViewport">
        <h1 class="text-3xl font-bold text-text">User Settings</h1>
        <ContainerCard padding="compact" variant="muted" aria-live="polite">
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
      </template>

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

            <div class="grid gap-4 md:grid-cols-2">
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
            </div>

            <AppButton class="self-start" variant="primary" @click="handleResetFontsToDefaults">
              Reset fonts to defaults
            </AppButton>
          </div>

          <ContainerCard padding="compact" variant="muted">
            <AppFieldLabel as="div">Live font preview</AppFieldLabel>
            <div class="mt-4 flex flex-col gap-4">
              <div>
                <div class="text-2xl text-text">
                  Settings should feel personal, but still readable at a glance.
                </div>
              </div>
              <div>
                <div class="font-data text-3xl font-bold text-text tabular-nums">
                  03:45 · 128.4 hrs
                </div>
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
                  <div class="font-semibold text-text">Hide tags</div>
                  <p class="mt-2 text-sm leading-6 text-text-muted">
                    Hides tags from the UI but preserves all existing tag data.
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
            <AppFieldLabel as="div">Tray menu shortcuts</AppFieldLabel>

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
              <div class="grid min-w-0 gap-4 lg:grid-cols-2">
                <AppField label="Label">
                  <AppTextInput v-model="shortcut.label" placeholder="Deep work" />
                </AppField>

                <AppField label="Timer">
                  <div class="flex flex-wrap gap-2">
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
                </AppField>

                <AppField v-if="shortcut.timerMode === 'countdown'" label="Minutes">
                  <AppTextInput
                    :value="shortcut.durationMinutes ?? ''"
                    min="1"
                    step="1"
                    type="number"
                    placeholder="30"
                    @input="handleTrayShortcutDurationInput(shortcut, $event)"
                  />
                </AppField>

                <AppField label="Project">
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

                <div class="min-w-0 lg:col-span-2">
                  <AppField as="div" label="Tags">
                    <div v-if="sortedTags.length" class="flex flex-wrap gap-2">
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
                  </AppField>
                </div>
              </div>

              <div
                class="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t border-border-subtle pt-4"
              >
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
                </div>
                <AppButton variant="danger" @click="removeTrayShortcut(shortcut.id)">
                  Remove
                </AppButton>
              </div>
            </ContainerCard>

            <div class="flex flex-wrap gap-2">
              <AppButton variant="primary" @click="addTrayShortcut"> Add shortcut </AppButton>
            </div>
          </section>

          <section class="flex flex-col gap-4 border-t border-border-subtle pt-6">
            <AppFieldLabel as="div">Timer completion sound</AppFieldLabel>

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
                    { transientNotification: true },
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
        </div>
      </ContainerCard>

      <template v-if="isBelowSmViewport">
        <ContainerCard as="section">
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

        <p class="text-center text-xs text-text-subtle">
          Work Log {{ runtimeConfig.public.appVersion }}
        </p>
      </template>
    </template>
  </WorkspaceSidebarLayout>
</template>
