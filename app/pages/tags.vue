<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-simple' })

const { hideTags } = useUserSettings()
</script>

<template>
  <ContainerCard v-if="hideTags" class="mx-auto max-w-3xl" padding="comfortable">
    <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Tags hidden</div>
    <div class="mt-2 text-2xl font-bold text-text">Project-first mode is active</div>
    <p class="mt-3 text-sm leading-6 text-text-muted">
      Tag data is still preserved, but tag pages are hidden while this workflow setting is on. You
      can re-enable tags from
      <NuxtLink to="/settings" class="text-link underline hover:text-link-hover">
        Settings
      </NuxtLink>
      .
    </p>
  </ContainerCard>
  <div v-else class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <TagsManager />
  </div>
</template>
