import { computed, onMounted, ref } from 'vue'

import { signOut } from 'firebase/auth'
import { useCurrentUser, useFirebaseAuth, useRouter } from '#imports'

export function useSettingsAccount() {
  const router = useRouter()
  const auth = useFirebaseAuth()
  const currentUser = useCurrentUser()

  const isAccountUiReady = ref(false)

  const accountDisplayName = computed(() => {
    const user = currentUser.value

    if (user === undefined || user === null) {
      return null
    }

    return user.displayName?.trim() || null
  })
  const accountEmail = computed(() => currentUser.value?.email ?? null)
  const accountPhotoUrl = computed(() => currentUser.value?.photoURL ?? null)
  const accountUid = computed(() => currentUser.value?.uid ?? null)

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth)
      await router.push('/login')
    }
  }

  onMounted(() => {
    isAccountUiReady.value = true
  })

  return {
    accountDisplayName,
    accountEmail,
    accountPhotoUrl,
    accountUid,
    currentUser,
    handleSignOut,
    isAccountUiReady,
  }
}
