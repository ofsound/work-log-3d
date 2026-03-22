<script setup lang="ts">
import { signOut } from 'firebase/auth'
const router = useRouter()
const auth = useFirebaseAuth()

const currentTime = ref('')

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
    <div>/</div>
    <NuxtLink to="/reports" class="hover:underline">Reports</NuxtLink>
    <div class="ml-auto flex items-center gap-2">
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
