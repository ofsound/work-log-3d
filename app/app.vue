<script setup lang="ts">
import { getPostAuthRedirect, shouldRedirectToLogin } from '~/utils/auth-navigation'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  watch(user, (currentUser, prevUser) => {
    if (
      shouldRedirectToLogin({
        currentUser,
        previousUser: prevUser,
        routePath: route.path,
      })
    ) {
      router.push('/login')
    } else if (currentUser) {
      router.push(getPostAuthRedirect(route.query.redirect))
    }
  })
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
