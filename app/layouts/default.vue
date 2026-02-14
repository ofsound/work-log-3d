<script setup lang="ts">
import HeaderBar from '@/components/HeaderBar.vue'
</script>

<template>
  <div
    class="mx-auto h-dvh max-w-250 bg-white bg-[linear-gradient(to_right,#73737320_1px,transparent_1px),linear-gradient(to_bottom,#73737320_1px,transparent_1px)] bg-size-[15px_15px] shadow-lg shadow-black"
  >
    <HeaderBar />
    <div class="h-full pt-8">
      <slot />
    </div>
  </div>
</template>
