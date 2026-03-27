<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

import { formatReportDateTime, formatReportHours, formatReportTime } from '~/utils/report-ui'

import type { ReportSnapshot } from '~~/shared/worklog'

const props = defineProps({
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  snapshot: { type: Object as PropType<ReportSnapshot | null>, default: null },
  publishedAtIso: { type: String, default: '' },
  hideTags: { type: Boolean, default: false },
  publicMode: { type: Boolean, default: false },
})

const publishedAtLabel = computed(() => {
  if (!props.publishedAtIso || !props.snapshot) {
    return ''
  }

  return formatReportDateTime(props.publishedAtIso, props.snapshot.timezone)
})

const visibleInsights = computed(
  () =>
    props.snapshot?.insights.filter((insight) => !props.hideTags || insight.id !== 'top-tag') ?? [],
)
</script>

<template>
  <div v-if="snapshot" class="flex flex-col gap-8">
    <ContainerCard
      as="section"
      class="bg-linear-to-br from-overview-start to-overview-end px-6 py-6 text-header-text"
      padding="comfortable"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <div class="text-sm tracking-[0.2em] text-header-muted uppercase">
            {{ publicMode ? 'Client report' : 'Live preview' }}
          </div>
          <h2 class="mt-2 text-3xl font-bold">{{ title }}</h2>
          <div class="mt-2 text-sm text-header-muted">
            {{ snapshot.rangeLabel }} · {{ snapshot.timezone }}
          </div>
          <div
            v-if="summary"
            class="mt-4 max-w-3xl text-sm leading-7 whitespace-pre-line text-header-text/90"
          >
            {{ summary }}
          </div>
        </div>
        <div class="rounded-xl bg-header-toggle px-4 py-3 text-right">
          <div class="text-xs tracking-[0.18em] text-header-muted uppercase">Total hours</div>
          <div class="mt-1 text-4xl font-bold">
            {{
              snapshot.overview.metrics[0]?.value ??
              formatReportHours(snapshot.overview.totalMinutes)
            }}
          </div>
          <div v-if="publishedAtLabel" class="mt-2 text-xs text-header-muted">
            Published {{ publishedAtLabel }}
          </div>
        </div>
      </div>
    </ContainerCard>

    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ContainerCard
        v-for="metric in snapshot.overview.metrics"
        :key="metric.label"
        as="article"
        class="rounded-xl"
        padding="compact"
      >
        <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">{{ metric.label }}</div>
        <div class="mt-2 text-2xl font-bold text-text">{{ metric.value }}</div>
      </ContainerCard>
    </section>

    <ContainerCard v-if="visibleInsights.length > 0" as="section">
      <div class="text-lg font-bold text-text">Highlights</div>
      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ContainerCard
          v-for="insight in visibleInsights"
          :key="insight.id"
          as="article"
          class="rounded-xl shadow-none"
          padding="compact"
          variant="muted"
        >
          <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">
            {{ insight.label }}
          </div>
          <div class="mt-2 text-base font-semibold text-text">{{ insight.value }}</div>
        </ContainerCard>
      </div>
    </ContainerCard>

    <section class="grid gap-6 xl:grid-cols-2">
      <ContainerCard>
        <div class="text-lg font-bold text-text">Hours by project</div>
        <div class="mt-4 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-text-subtle">
              <tr class="border-b border-border-subtle">
                <th class="py-2 pr-4 font-medium">Project</th>
                <th class="py-2 pr-4 font-medium">Hours</th>
                <th class="py-2 pr-4 font-medium">Share</th>
                <th class="py-2 font-medium">Sessions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in snapshot.projectBreakdown"
                :key="row.id"
                class="border-b border-border-subtle last:border-0"
              >
                <td class="py-3 pr-4 font-medium text-text">{{ row.label }}</td>
                <td class="py-3 pr-4 text-text">{{ formatReportHours(row.minutes) }}</td>
                <td class="py-3 pr-4 text-text">{{ row.percentageOfTotal }}%</td>
                <td class="py-3 text-text">{{ row.sessionCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContainerCard>

      <ContainerCard v-if="!hideTags">
        <div class="text-lg font-bold text-text">Hours by tag</div>
        <div class="mt-4 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-text-subtle">
              <tr class="border-b border-border-subtle">
                <th class="py-2 pr-4 font-medium">Tag</th>
                <th class="py-2 pr-4 font-medium">Hours</th>
                <th class="py-2 pr-4 font-medium">Share</th>
                <th class="py-2 font-medium">Sessions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in snapshot.tagBreakdown"
                :key="row.id"
                class="border-b border-border-subtle last:border-0"
              >
                <td class="py-3 pr-4 font-medium text-text">{{ row.label }}</td>
                <td class="py-3 pr-4 text-text">{{ formatReportHours(row.minutes) }}</td>
                <td class="py-3 pr-4 text-text">{{ row.percentageOfTotal }}%</td>
                <td class="py-3 text-text">{{ row.sessionCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContainerCard>
    </section>

    <ContainerCard v-if="!hideTags" as="section">
      <div class="text-lg font-bold text-text">Project by tag matrix</div>
      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="text-text-subtle">
            <tr class="border-b border-border-subtle">
              <th class="py-2 pr-4 font-medium">Project</th>
              <th
                v-for="column in snapshot.projectTagMatrix.columns"
                :key="column.tagId"
                class="py-2 pr-4 font-medium"
              >
                {{ column.tagName }}
              </th>
              <th class="py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in snapshot.projectTagMatrix.rows"
              :key="row.projectId"
              class="border-b border-border-subtle last:border-0"
            >
              <td class="py-3 pr-4 font-medium text-text">{{ row.projectName }}</td>
              <td
                v-for="cell in row.cells"
                :key="`${row.projectId}-${cell.tagId}`"
                class="py-3 pr-4 text-text"
              >
                {{ cell.minutes > 0 ? formatReportHours(cell.minutes) : '—' }}
              </td>
              <td class="py-3 font-medium text-text">{{ formatReportHours(row.minutes) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ContainerCard>

    <section class="grid gap-6 xl:grid-cols-2">
      <ContainerCard>
        <div class="text-lg font-bold text-text">Daily totals</div>
        <div class="mt-4 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-text-subtle">
              <tr class="border-b border-border-subtle">
                <th class="py-2 pr-4 font-medium">Day</th>
                <th class="py-2 pr-4 font-medium">Hours</th>
                <th class="py-2 font-medium">Segments</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rollup in snapshot.dailyRollups"
                :key="rollup.dateKey"
                class="border-b border-border-subtle last:border-0"
              >
                <td class="py-3 pr-4 text-text">{{ rollup.label }}</td>
                <td class="py-3 pr-4 text-text">{{ formatReportHours(rollup.minutes) }}</td>
                <td class="py-3 text-text">{{ rollup.sessionCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContainerCard>

      <ContainerCard>
        <div class="text-lg font-bold text-text">Weekly totals</div>
        <div class="mt-4 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-text-subtle">
              <tr class="border-b border-border-subtle">
                <th class="py-2 pr-4 font-medium">Week</th>
                <th class="py-2 pr-4 font-medium">Hours</th>
                <th class="py-2 font-medium">Segments</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rollup in snapshot.weeklyRollups"
                :key="rollup.weekStartDateKey"
                class="border-b border-border-subtle last:border-0"
              >
                <td class="py-3 pr-4 text-text">{{ rollup.label }}</td>
                <td class="py-3 pr-4 text-text">{{ formatReportHours(rollup.minutes) }}</td>
                <td class="py-3 text-text">{{ rollup.sessionCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContainerCard>
    </section>

    <ContainerCard as="section">
      <div class="text-lg font-bold text-text">Session detail</div>
      <div class="mt-5 flex flex-col gap-6">
        <ContainerCard
          v-for="group in snapshot.sessionGroups"
          :key="group.dateKey"
          padding="compact"
          variant="muted"
        >
          <div class="flex flex-wrap items-center gap-3">
            <div class="text-lg font-semibold text-text">{{ group.label }}</div>
            <DurationPill :minutes="group.totalMinutes" variant="compact" />
            <div class="text-xs tracking-[0.16em] text-text-subtle uppercase">
              {{ group.sessionCount }} sessions
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-3">
            <ContainerCard
              v-for="session in group.sessions"
              :key="session.sessionId"
              as="article"
              class="rounded-xl"
              padding="compact"
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="max-w-3xl">
                  <div class="flex flex-wrap items-center gap-2">
                    <div class="font-bold text-text">{{ session.projectName }}</div>
                    <div class="text-sm text-text-subtle">
                      {{ formatReportTime(session.clampedStartTimeIso, snapshot.timezone) }} -
                      {{ formatReportTime(session.clampedEndTimeIso, snapshot.timezone) }}
                    </div>
                  </div>
                  <div class="my-5 font-data whitespace-pre-line">
                    {{ session.notes }}
                  </div>
                  <div v-if="!hideTags" class="mt-3 flex flex-wrap gap-2">
                    <div
                      v-for="tagName in session.tagNames"
                      :key="`${session.sessionId}-${tagName}`"
                      class="rounded-full bg-chip px-3 py-1 text-xs font-medium text-chip-text"
                    >
                      {{ tagName }}
                    </div>
                  </div>
                </div>
                <div class="rounded-xl bg-surface-subtle px-3 py-2 text-sm text-text">
                  <div class="font-semibold">{{ formatReportHours(session.durationMinutes) }}</div>
                  <div class="mt-1 text-text-subtle">
                    {{ formatReportDateTime(session.startTimeIso, snapshot.timezone) }}
                  </div>
                </div>
              </div>
            </ContainerCard>
          </div>
        </ContainerCard>
      </div>
    </ContainerCard>
  </div>
</template>
