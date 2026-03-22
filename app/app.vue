<script setup lang="ts">
import { computed } from 'vue'
import { useCurrentUser, useRoute } from '#imports'

import { isPublicAnonymousPath } from '~/utils/auth-navigation'

const route = useRoute()
const user = useCurrentUser()

const shouldRenderRoutePage = computed(() => {
  if (isPublicAnonymousPath(route.path)) {
    return true
  }

  return Boolean(user.value)
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage v-if="shouldRenderRoutePage" />
    </NuxtLayout>
  </div>
</template>
