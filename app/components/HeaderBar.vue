<script setup lang="ts">
import { newTimeboxIconSvg } from '~~/shared/icons/newTimeboxIcon'

import { usePhoneMode } from '~/composables/usePhoneMode'

interface HeaderNavItem {
  isActive: (path: string) => boolean
  label: string
  to: string
}

const route = useRoute()
const isDesktopViewport = useMediaQuery('(min-width: 768px)', false)
const { isPhoneMode } = usePhoneMode()
const { hideTags } = useUserSettings()
const mobileMenuOpen = ref(false)
const mobileNavPanelId = 'mobile-navigation-panel'
const savedBodyOverflow = ref<string | null>(null)
const savedHtmlOverflow = ref<string | null>(null)

const isRouteActive = (path: string, prefixes: string[]) => {
  return prefixes.some((prefix) => {
    if (prefix === '/') {
      return path === '/'
    }

    return path === prefix || path.startsWith(`${prefix}/`)
  })
}

const navItems = computed<HeaderNavItem[]>(() => {
  const items: HeaderNavItem[] = [
    {
      label: 'WORK LOG',
      to: '/',
      isActive: (path) => isRouteActive(path, ['/']),
    },
    {
      label: 'New Timebox',
      to: '/new',
      isActive: (path) => isRouteActive(path, ['/new']),
    },
    {
      label: 'Sessions',
      to: '/sessions',
      isActive: (path) => isRouteActive(path, ['/sessions']),
    },
    {
      label: 'Projects',
      to: '/projects',
      isActive: (path) => isRouteActive(path, ['/projects', '/project']),
    },
  ]

  if (!hideTags.value) {
    items.push({
      label: 'Tags',
      to: '/tags',
      isActive: (path) => isRouteActive(path, ['/tags', '/tag']),
    })
  }

  if (!isPhoneMode.value) {
    items.push({
      label: 'Reports',
      to: '/reports',
      isActive: (path) => isRouteActive(path, ['/reports']),
    })
  }

  return items
})

const isSettingsRoute = computed(() => isRouteActive(route.path, ['/settings']))

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const restoreScrollLock = () => {
  if (!import.meta.client) {
    return
  }

  document.body.style.overflow = savedBodyOverflow.value ?? ''
  document.documentElement.style.overflow = savedHtmlOverflow.value ?? ''
  savedBodyOverflow.value = null
  savedHtmlOverflow.value = null
}

const syncScrollLock = (locked: boolean) => {
  if (!import.meta.client) {
    return
  }

  if (!locked) {
    restoreScrollLock()
    return
  }

  if (savedBodyOverflow.value === null) {
    savedBodyOverflow.value = document.body.style.overflow
  }

  if (savedHtmlOverflow.value === null) {
    savedHtmlOverflow.value = document.documentElement.style.overflow
  }

  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && mobileMenuOpen.value) {
    closeMobileMenu()
  }
}

const getMobileNavLinkClassName = (item: HeaderNavItem) => {
  const isActive = item.isActive(route.path)

  return [
    'block rounded-2xl px-4 py-3 text-base font-semibold tracking-[0.01em] transition-colors',
    isActive
      ? 'bg-header-toggle-active text-header-text'
      : 'text-header-text hover:bg-header-toggle hover:text-header-text',
  ]
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  restoreScrollLock()
})

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu()
  },
)

watch(isDesktopViewport, (isDesktop) => {
  if (isDesktop) {
    closeMobileMenu()
  }
})

watch(
  () => mobileMenuOpen.value && !isDesktopViewport.value,
  (locked) => {
    syncScrollLock(locked)
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="fixed z-100 hidden h-header-bar w-full items-center gap-3 bg-header px-4 tracking-wide text-header-text md:flex"
  >
    <NuxtLink to="/" class="font-bold hover:underline">WORK LOG</NuxtLink>
    <div class="text-sm leading-none text-header-muted select-none" aria-hidden="true">/</div>
    <NuxtLink
      to="/new"
      class="flex items-center opacity-80 transition-opacity hover:opacity-100"
      title="New Timebox (Classic)"
    >
      <!-- Static markup from shared/icons/newTimeboxIcon (same source as Electron tray) -->
      <!-- eslint-disable vue/no-v-html -->
      <span
        class="inline-flex size-[18px] shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        aria-hidden="true"
        v-html="newTimeboxIconSvg()"
      />
      <!-- eslint-enable vue/no-v-html -->
    </NuxtLink>
    <div class="text-sm leading-none text-header-muted select-none" aria-hidden="true">/</div>
    <NuxtLink to="/sessions" class="hover:underline">Sessions</NuxtLink>
    <div class="text-sm leading-none text-header-muted select-none" aria-hidden="true">/</div>
    <NuxtLink to="/projects" class="hover:underline">Projects</NuxtLink>
    <template v-if="!hideTags">
      <div class="text-sm leading-none text-header-muted select-none" aria-hidden="true">/</div>
      <NuxtLink to="/tags" class="hover:underline">Tags</NuxtLink>
    </template>
    <div class="text-sm leading-none text-header-muted select-none" aria-hidden="true">/</div>
    <NuxtLink to="/reports" class="hover:underline">Reports</NuxtLink>
    <div class="ml-auto flex items-center gap-2">
      <ThemeSwitcher />
      <NuxtLink
        to="/settings"
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-header-muted transition-colors hover:bg-header-toggle-active hover:text-header-text"
        aria-label="Settings"
        title="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          class="size-[18px]"
          aria-hidden="true"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
          />
        </svg>
      </NuxtLink>
    </div>
  </div>

  <div class="md:hidden">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="mobileMenuOpen"
        type="button"
        class="fixed inset-0 z-[110] bg-overlay-scrim/35 backdrop-blur-[2px]"
        aria-label="Close navigation menu"
        @click="closeMobileMenu"
      />
    </Transition>

    <button
      type="button"
      class="fixed top-3 right-3 z-[120] flex size-11 items-center justify-center rounded-full border border-header-toggle-border bg-header/95 text-header-text shadow-panel backdrop-blur-sm transition-colors hover:bg-header-toggle-active focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none"
      :aria-controls="mobileNavPanelId"
      :aria-expanded="mobileMenuOpen"
      :aria-label="mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
      @click="toggleMobileMenu"
    >
      <svg
        v-if="mobileMenuOpen"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        class="size-5"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        class="size-5"
        aria-hidden="true"
      >
        <path d="M3 12h18" />
        <path d="M3 6h18" />
        <path d="M3 18h18" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-1 scale-95 opacity-0"
    >
      <div
        v-if="mobileMenuOpen"
        :id="mobileNavPanelId"
        class="fixed top-16 right-3 z-[115] max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] origin-top-right overflow-auto rounded-3xl border border-header-toggle-border bg-header/95 p-3 text-header-text shadow-panel backdrop-blur-sm"
        role="dialog"
        aria-label="Navigation"
        aria-modal="true"
      >
        <nav aria-label="Primary">
          <ul class="flex flex-col gap-1">
            <li v-for="item in navItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                :class="getMobileNavLinkClassName(item)"
                @click="closeMobileMenu"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <div
          class="mt-4 flex items-center justify-end gap-2 border-t border-header-toggle-border pt-4"
        >
          <ThemeSwitcher
            class="h-11 w-11 rounded-2xl border border-header-toggle-border bg-header-toggle text-header-text hover:bg-header-toggle-active hover:text-header-text"
          />
          <NuxtLink
            to="/settings"
            class="flex h-11 w-11 items-center justify-center rounded-2xl border border-header-toggle-border bg-header-toggle text-header-text transition-colors hover:bg-header-toggle-active hover:text-header-text"
            :class="isSettingsRoute ? 'bg-header-toggle-active text-header-text' : ''"
            aria-label="Settings"
            title="Settings"
            @click="closeMobileMenu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              class="size-5"
              aria-hidden="true"
            >
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
              />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>
