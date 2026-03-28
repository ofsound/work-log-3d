<script setup lang="ts">
import type { Project, TimeBox } from '~~/shared/worklog'

const props = defineProps<{
  groupedTimeBoxes: TimeBox[][]
  panelDay: Date | null
  panelSessionId: string
  panelTimeBoxes: TimeBox[]
  project: Project | null
  selectedSessionId: string
  onClosePanel: () => void
  onOpenSession: (payload: { day: Date; sessionId: string }) => void
}>()

const handleOpenGroupedSession = (group: TimeBox[], sessionId: string) => {
  const matched = group.find((item) => item.id === sessionId)
  const day = matched?.startTime ?? group[0]?.startTime

  if (!day) {
    return
  }

  props.onOpenSession({
    day,
    sessionId,
  })
}
</script>

<template>
  <SessionsWorkspaceShell
    :aside-panel-class="'w-full min-w-0 max-w-full pt-0 pl-0'"
    :overlay-aside="Boolean(panelSessionId)"
    @dismiss-aside="onClosePanel"
  >
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

        <DaySessionsOverviewPanel
          v-for="(group, index) in groupedTimeBoxes"
          :key="`${index}-${group[0]?.id ?? 'empty'}`"
          :day="group[0]?.startTime ?? new Date()"
          :project-by-id="project ? { [project.id]: project } : {}"
          :selected-session-id="selectedSessionId"
          show-project-name
          :time-boxes="group"
          use-project-card-styles
          @open-session="handleOpenGroupedSession(group, $event)"
        />
      </div>
    </div>

    <template #aside>
      <ProjectCalendarSidebar
        v-if="panelSessionId && panelDay"
        :day="panelDay"
        mode="session"
        overlay
        :project="project"
        :selected-session-id="selectedSessionId"
        :session-id="panelSessionId"
        :time-boxes="panelTimeBoxes"
        @back-to-day="onClosePanel"
        @close="onClosePanel"
        @open-session="
          onOpenSession({
            day: panelDay,
            sessionId: $event,
          })
        "
      />
    </template>
  </SessionsWorkspaceShell>
</template>
