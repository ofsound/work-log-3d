<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-simple' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <TimeBoxAdder />
  </div>
</template>
