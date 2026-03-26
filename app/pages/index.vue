<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-bleed' })
</script>

<template>
  <div class="flex h-2/3 flex-col items-center justify-center gap-8">
    <img
      src="/icon-white-not-so-thin.svg"
      alt=""
      width="400"
      height="400"
      class="h-[400px] w-[400px] max-w-[min(400px,calc(100vw-2rem))] shrink-0 object-contain"
      decoding="async"
    />
    <div class="px-20 py-12">
      <span
        class="inline-block bg-linear-to-b from-hero-start to-hero-end bg-clip-text text-4xl font-bold tracking-wider text-transparent text-shadow-hero"
      >
        Work Log
      </span>
    </div>
  </div>
</template>
