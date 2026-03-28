<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    contentBodyClass?: string
    sidebarBodyClass?: string
    sidebarFooterClass?: string
    /** When this value changes, the main content column scrolls to the top. */
    contentScrollResetKey?: string | number | null
  }>(),
  {
    contentBodyClass: '',
    sidebarBodyClass: '',
    sidebarFooterClass: '',
    contentScrollResetKey: undefined,
  },
)

const contentBodyEl = ref<HTMLElement | null>(null)

watch(
  () => props.contentScrollResetKey,
  async () => {
    if (props.contentScrollResetKey === undefined) {
      return
    }

    await nextTick()
    const el = contentBodyEl.value
    if (el) {
      el.scrollTop = 0
    }
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
    <aside
      class="flex w-full shrink-0 flex-col overflow-hidden border-b border-border-subtle bg-surface/96 backdrop-blur max-lg:max-h-[var(--height-workspace-sidebar-mobile-max)] lg:h-full lg:max-h-none lg:w-[var(--width-workspace-sidebar-rail)] lg:border-r lg:border-b-0"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain" :class="sidebarBodyClass">
          <slot name="sidebar" />
        </div>

        <div v-if="$slots.sidebarFooter" class="shrink-0" :class="sidebarFooterClass">
          <slot name="sidebarFooter" />
        </div>
      </div>
    </aside>

    <div
      ref="contentBodyEl"
      class="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
      :class="contentBodyClass"
    >
      <slot />
    </div>
  </div>
</template>
