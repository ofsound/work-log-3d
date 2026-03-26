<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-bleed' })
</script>

<template>
  <div class="flex h-3/4 flex-col items-center justify-center gap-8">
    <img
      src="/icon-white-not-so-thin.svg"
      alt=""
      width="400"
      height="400"
      class="h-[400px] w-[400px] max-w-[min(400px,calc(100vw-2rem))] shrink-0 object-contain"
      decoding="async"
    />
  </div>
</template>
