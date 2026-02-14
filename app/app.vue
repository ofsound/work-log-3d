<script setup lang="ts">
const user = useCurrentUser()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  watch(user, (currentUser, prevUser) => {
    if (prevUser && !currentUser && route.path !== '/login') {
      router.push('/login')
    } else if (currentUser && typeof route.query.redirect === 'string') {
      router.push(route.query.redirect)
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
