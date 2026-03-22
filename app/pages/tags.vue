<script setup lang="ts">
const { hideTags } = useUserSettings()
</script>

<template>
  <div class="h-full overflow-auto px-11 pt-8 pb-4">
    <div
      v-if="hideTags"
      class="mx-auto max-w-3xl rounded-2xl border border-border-subtle bg-surface px-6 py-6 shadow-panel"
    >
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
    </div>
    <TagsManager v-else />
  </div>
</template>
