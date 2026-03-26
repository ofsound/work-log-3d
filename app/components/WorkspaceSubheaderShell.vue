<script setup lang="ts">
import { computed, type PropType } from 'vue'

import ContainerCard from '~/components/ContainerCard.vue'
import {
  WORKSPACE_SUBHEADER_CARD_CLASS_NAME,
  WORKSPACE_SUBHEADER_FOOTER_CLASS_NAME,
  WORKSPACE_SUBHEADER_INNER_CLASS_NAME,
  WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES,
  WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES,
  type WorkspaceSubheaderLayout,
  type WorkspaceSubheaderVariant,
} from '~/utils/workspace-subheader'

const props = defineProps({
  layout: {
    type: String as PropType<WorkspaceSubheaderLayout>,
    default: 'fluid',
  },
  surfaceStyle: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
  variant: {
    type: String as PropType<WorkspaceSubheaderVariant>,
    default: 'neutral',
  },
})

const innerClassName = computed(() => [
  WORKSPACE_SUBHEADER_INNER_CLASS_NAME,
  WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES[props.layout],
])
</script>

<template>
  <ContainerCard
    as="div"
    padding="none"
    :class="[WORKSPACE_SUBHEADER_CARD_CLASS_NAME, WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES[variant]]"
    :style="surfaceStyle"
  >
    <div :class="innerClassName">
      <slot />

      <div v-if="$slots.footer" :class="WORKSPACE_SUBHEADER_FOOTER_CLASS_NAME">
        <slot name="footer" />
      </div>
    </div>
  </ContainerCard>
</template>
