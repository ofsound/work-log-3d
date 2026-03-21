<script setup lang="ts">
import { signOut } from 'firebase/auth'

import SortAscending from '@/icons/SortAscending.vue'
import SortDescending from '@/icons/SortDescending.vue'

const store = useStore()
const route = useRoute()
const router = useRouter()
const auth = useFirebaseAuth()

const currentTime = ref('')

const showSessionsSort = computed(() => {
  const mode = Array.isArray(route.query.mode) ? route.query.mode[0] : route.query.mode

  return route.path === '/sessions' && (mode === undefined || mode === 'list')
})

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString([], { timeStyle: 'short' })
}

updateTime()

async function handleSignOut() {
  if (auth) {
    await signOut(auth)
    await router.push('/login')
  }
}
</script>

<template>
  <div
    class="fixed z-100 flex w-full max-w-250 items-center gap-3 bg-header px-4 py-1 tracking-wide text-header-text"
  >
    <NuxtLink to="/" class="font-bold hover:underline">WORK LOG</NuxtLink>
    <div>/</div>
    <NuxtLink to="/new" class="">&nbsp;✚&nbsp;</NuxtLink>
    <div>/</div>
    <NuxtLink to="/projects" class="hover:underline">Projects</NuxtLink>
    <div>/</div>
    <NuxtLink to="/tags" class="hover:underline">Tags</NuxtLink>
    <div>/</div>
    <NuxtLink to="/sessions" class="hover:underline">Sessions</NuxtLink>
    <div class="ml-auto flex items-center gap-2">
      <button
        v-if="showSessionsSort"
        class="cursor-pointer text-header-muted hover:text-header-text"
        @click="store.sortOrderReversed = !store.sortOrderReversed"
      >
        <SortAscending v-if="!store.sortOrderReversed" />
        <SortDescending v-if="store.sortOrderReversed" />
      </button>
      <ThemeSwitcher />
      <button
        class="cursor-pointer text-sm text-header-muted hover:text-header-text"
        @click="handleSignOut"
      >
        Sign out
      </button>
      <div class="text-sm text-header-muted">{{ currentTime }}</div>
    </div>
  </div>
</template>
