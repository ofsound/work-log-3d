<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes } from 'vue'

import {
  getContainerCardClassName,
  type ContainerCardPadding,
  type ContainerCardVariant,
} from '~/utils/container-card'

type ContainerCardRootTag = 'article' | 'aside' | 'button' | 'div' | 'section'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: ContainerCardRootTag
    interactive?: boolean
    padding?: ContainerCardPadding
    selected?: boolean
    variant?: ContainerCardVariant
  }>(),
  {
    as: 'div',
    interactive: false,
    padding: 'default',
    selected: false,
    variant: 'default',
  },
)

const attrs = useAttrs() as HTMLAttributes

const rootAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class

  return nextAttrs
})

const className = computed(() => [
  getContainerCardClassName({
    interactive: props.interactive,
    padding: props.padding,
    selected: props.selected,
    variant: props.variant,
  }),
  attrs.class,
])
</script>

<template>
  <component :is="as" v-bind="rootAttrs" :class="className">
    <slot />
  </component>
</template>
