<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { definePageMeta, useCurrentUser, useFirebaseAuth, useRoute, useRouter } from '#imports'

import { getPostAuthRedirect } from '~/utils/auth-navigation'

definePageMeta({
  layout: 'auth',
})

const auth = useFirebaseAuth()
const user = useCurrentUser()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)
const isAuthResolved = computed(() => user.value !== undefined)

// Redirect if already logged in
watch(
  user,
  (currentUser) => {
    if (currentUser) {
      router.push(getPostAuthRedirect(route.query.redirect))
    }
  },
  { immediate: true },
)

async function handleEmailAuth() {
  if (!auth || !email.value || !password.value) return
  errorMessage.value = ''
  isLoading.value = true
  try {
    if (isSignUp.value) {
      await createUserWithEmailAndPassword(auth, email.value, password.value)
    } else {
      await signInWithEmailAndPassword(auth, email.value, password.value)
    }
    await router.push(getPostAuthRedirect(route.query.redirect))
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Authentication failed'
  } finally {
    isLoading.value = false
  }
}

async function handleGoogleSignIn() {
  if (!auth) return
  errorMessage.value = ''
  isLoading.value = true
  try {
    await signInWithPopup(auth, new GoogleAuthProvider())
    await router.push(getPostAuthRedirect(route.query.redirect))
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Google sign-in failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div
    class="w-full max-w-sm rounded-lg border border-border-subtle bg-surface px-8 py-6 shadow-panel"
  >
    <template v-if="!isAuthResolved">
      <h1 class="mb-2 text-center text-2xl font-bold text-text">Work Log</h1>
      <p class="text-center text-sm text-text-muted">Checking session...</p>
    </template>

    <template v-else>
      <h1 class="mb-6 text-center text-2xl font-bold text-text">Work Log</h1>
      <p class="mb-6 text-center text-sm text-text-muted">Sign in to continue</p>

      <form class="flex flex-col gap-4" @submit.prevent="handleEmailAuth">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="rounded border border-input-border bg-input px-3 py-2 text-text placeholder:text-text-subtle"
          required
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="rounded border border-input-border bg-input px-3 py-2 text-text placeholder:text-text-subtle"
          required
          minlength="6"
        />
        <p v-if="errorMessage" class="text-sm text-danger">
          {{ errorMessage }}
        </p>
        <AppButton type="submit" variant="primary" :disabled="isLoading">
          {{ isSignUp ? 'Create account' : 'Sign in' }}
        </AppButton>
      </form>

      <button
        type="button"
        class="mt-4 block w-full cursor-pointer text-center text-sm text-link underline hover:text-link-hover"
        @click="isSignUp = !isSignUp"
      >
        {{ isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up' }}
      </button>

      <div class="my-6 flex items-center gap-3">
        <div class="h-px flex-1 bg-border" />
        <span class="text-xs text-text-subtle">or</span>
        <div class="h-px flex-1 bg-border" />
      </div>

      <AppButton block variant="secondary" :disabled="isLoading" @click="handleGoogleSignIn">
        Sign in with Google
      </AppButton>
    </template>
  </div>
</template>
