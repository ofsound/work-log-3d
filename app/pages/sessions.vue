<script setup lang="ts">
import { definePageMeta } from '#imports'

import SessionsWorkspace from '~/components/SessionsWorkspace.vue'

definePageMeta({ layout: 'main-workspace' })
</script>

<template>
  <SessionsWorkspace />
</template>
