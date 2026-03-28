<script setup lang="ts">
import type { Project, TimeBox } from '~~/shared/worklog'

defineProps<{
  groupedTimeBoxes: TimeBox[][]
  project: Project | null
}>()
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <ContainerCard
        v-if="groupedTimeBoxes.length === 0"
        class="border-dashed py-8 text-center shadow-none"
        padding="comfortable"
        variant="subtle"
      >
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">No sessions</div>
        <div class="mt-2 text-sm text-text-muted">This project has no sessions yet.</div>
      </ContainerCard>

      <ProjectOverviewDay
        v-for="(group, index) in groupedTimeBoxes"
        :key="`${index}-${group[0]?.id ?? 'empty'}`"
        :project-colors="project?.colors"
        :project-overview-day-data="group"
      />
    </div>
  </div>
</template>
