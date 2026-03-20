<script setup lang="ts">
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'

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
  <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-8 py-6 shadow-md">
    <h1 class="mb-6 text-center text-2xl font-bold text-gray-800">Work Log</h1>
    <p class="mb-6 text-center text-sm text-gray-600">Sign in to continue</p>

    <form class="flex flex-col gap-4" @submit.prevent="handleEmailAuth">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="rounded border border-gray-300 px-3 py-2"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        class="rounded border border-gray-300 px-3 py-2"
        required
        minlength="6"
      />
      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>
      <button
        type="submit"
        class="cursor-pointer rounded bg-slate-600 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        :disabled="isLoading"
      >
        {{ isSignUp ? 'Create account' : 'Sign in' }}
      </button>
    </form>

    <button
      type="button"
      class="mt-4 block w-full cursor-pointer text-center text-sm text-slate-600 underline hover:text-slate-800"
      @click="isSignUp = !isSignUp"
    >
      {{ isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up' }}
    </button>

    <div class="my-6 flex items-center gap-3">
      <div class="h-px flex-1 bg-gray-300" />
      <span class="text-xs text-gray-500">or</span>
      <div class="h-px flex-1 bg-gray-300" />
    </div>

    <button
      type="button"
      class="w-full cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      :disabled="isLoading"
      @click="handleGoogleSignIn"
    >
      Sign in with Google
    </button>
  </div>
</template>
