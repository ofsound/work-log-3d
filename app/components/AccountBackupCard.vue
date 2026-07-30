<script setup lang="ts">
import { useAccountBackup } from '~/composables/useAccountBackup'

const { exportBackup, exportErrorMessage, exportMessage, isExporting } = useAccountBackup()
</script>

<template>
  <ContainerCard as="section" padding="compact">
    <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">Data backup</div>
    <p class="mt-2 text-sm leading-6 text-text-muted">
      Download a portable JSON copy of your projects, sessions, tags, notes, reports, settings, and
      timer state.
    </p>
    <AppButton block class="mt-4" variant="secondary" :disabled="isExporting" @click="exportBackup">
      {{ isExporting ? 'Preparing backup…' : 'Export backup' }}
    </AppButton>
    <p class="mt-2 text-xs leading-5 text-text-subtle">
      Preserves document IDs and Firestore value types. Login credentials are never included.
    </p>
    <div class="mt-2 text-sm" aria-live="polite">
      <p v-if="exportMessage" class="text-text-muted">{{ exportMessage }}</p>
      <p v-if="exportErrorMessage" class="text-danger">{{ exportErrorMessage }}</p>
    </div>
  </ContainerCard>
</template>
