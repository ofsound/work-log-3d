<script setup lang="ts">
import { useCurrentUser, useRoute } from '#imports'
import { computed, onMounted, ref } from 'vue'

import { useDelayedPending } from '~/composables/useDelayedPending'
import { useUserSettings } from '~/composables/useUserSettings'
import { isPublicAnonymousPath } from '~/utils/auth-navigation'
import { getShellBackgroundStyle } from '~/utils/user-settings'

const route = useRoute()
const user = useCurrentUser()
const { effectiveShellBackgroundPreset } = useUserSettings()
const hasMounted = ref(false)

onMounted(() => {
  hasMounted.value = true
})

const isPublicRoute = computed(() => isPublicAnonymousPath(route.path))
const shouldRenderProtectedContent = computed(
  () => hasMounted.value && user.value !== undefined && Boolean(user.value),
)
const shouldShowProtectedContent = computed(
  () => isPublicRoute.value || shouldRenderProtectedContent.value,
)
const isResolvingProtectedRoute = computed(
  () => !isPublicRoute.value && !shouldRenderProtectedContent.value,
)
const { showPending: shouldShowLoadingOverlay } = useDelayedPending(isResolvingProtectedRoute)
const shellBackgroundStyle = computed(() =>
  getShellBackgroundStyle(effectiveShellBackgroundPreset.value),
)
</script>

<template>
  <div :style="shellBackgroundStyle" class="relative mx-auto h-dvh bg-shell text-text shadow-shell">
    <HeaderBar v-if="shouldRenderProtectedContent" />
    <div :class="isPublicRoute ? 'h-full' : 'h-full md:pt-header-bar'">
      <slot v-if="shouldShowProtectedContent" />
    </div>
    <div
      v-if="shouldShowLoadingOverlay"
      data-shell-pending
      class="absolute inset-0 z-10 flex items-center justify-center bg-shell/92 md:pt-header-bar"
    >
      <div aria-hidden="true" class="flex w-full max-w-3xl flex-col gap-6 px-6">
        <div class="h-10 w-44 animate-pulse rounded-full bg-text-subtle/12" />
        <ContainerCard
          class="border-dashed shadow-none"
          data-shell-pending-card
          padding="comfortable"
          variant="subtle"
        >
          <div class="flex flex-col gap-4">
            <div class="h-3 w-28 animate-pulse rounded-full bg-text-subtle/14" />
            <div class="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
              <div
                class="h-36 animate-pulse rounded-md border border-border-subtle bg-surface-muted/60"
              />
              <div class="grid gap-3">
                <div
                  class="h-16 animate-pulse rounded-md border border-border-subtle bg-surface-muted/70"
                />
                <div
                  class="h-16 animate-pulse rounded-md border border-border-subtle bg-surface-muted/50"
                />
              </div>
            </div>
          </div>
        </ContainerCard>
      </div>
    </div>
  </div>
</template>
