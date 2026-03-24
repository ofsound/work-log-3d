<script setup lang="ts">
import type { PublicReport } from '~~/shared/worklog'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const token = computed<string>(() => {
  const value = route.params.token
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
})

const { data, error } = await useAsyncData(
  () => `public-report:${token.value}`,
  () => $fetch<PublicReport>(`/api/public-reports/${encodeURIComponent(token.value)}`),
  {
    watch: [token],
  },
)

if (error.value?.statusCode) {
  throw createError({
    statusCode: error.value.statusCode,
    statusMessage: error.value.statusMessage,
  })
}

useSeoMeta({
  title: () => data.value?.title ?? 'Client Report',
})

const printPage = () => {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div v-if="data" class="flex flex-col gap-6">
    <ContainerCard
      class="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-border-subtle bg-surface/95 py-3 backdrop-blur"
      padding="compact"
      variant="overlay"
    >
      <div>
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Shared report</div>
        <div class="mt-1 text-lg font-bold text-text">{{ data.title }}</div>
      </div>
      <button
        class="cursor-pointer rounded-lg bg-button-primary px-3 py-2 text-sm font-semibold text-button-primary-text shadow-button-primary hover:bg-button-primary-hover print:hidden"
        @click="printPage"
      >
        Print / Save PDF
      </button>
    </ContainerCard>

    <ReportSnapshotView
      :title="data.title"
      :summary="data.summary"
      :snapshot="data.snapshot"
      :published-at-iso="data.publishedAtIso"
      public-mode
    />
  </div>
</template>
