<script setup lang="ts">
import { isPublicAnonymousPath } from '~/utils/auth-navigation'
import { getShellBackgroundStyle } from '~/utils/user-settings'

const route = useRoute()
const user = useCurrentUser()
const { activeSettings } = useUserSettings()
const hasMounted = ref(false)

onMounted(() => {
  hasMounted.value = true
})

const isPublicRoute = computed(() => isPublicAnonymousPath(route.path))
const shouldRenderProtectedContent = computed(
  () => hasMounted.value && user.value !== undefined && Boolean(user.value),
)
const shouldShowLoadingOverlay = computed(
  () => !isPublicRoute.value && !shouldRenderProtectedContent.value,
)
const shellBackgroundStyle = computed(() =>
  getShellBackgroundStyle(activeSettings.value.appearance.backgroundPreset),
)
</script>

<template>
  <div :style="shellBackgroundStyle" class="relative mx-auto h-dvh bg-shell text-text shadow-shell">
    <HeaderBar v-if="shouldRenderProtectedContent" />
    <div :class="isPublicRoute ? 'h-full' : 'h-full md:pt-header-bar'">
      <slot />
    </div>
    <div
      v-if="shouldShowLoadingOverlay"
      class="absolute inset-0 z-10 flex items-center justify-center bg-shell/92 md:pt-header-bar"
    >
      <div class="text-text-subtle">Loading…</div>
    </div>
  </div>
</template>
