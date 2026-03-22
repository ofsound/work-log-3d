<script setup lang="ts">
const props = defineProps<{
  text: string
  tokens?: string[]
}>()

interface HighlightSegment {
  text: string
  highlighted: boolean
}

const normalizedTokens = computed(() =>
  [
    ...new Set((props.tokens ?? []).map((token) => token.trim().toLowerCase()).filter(Boolean)),
  ].sort((left, right) => right.length - left.length),
)

const segments = computed<HighlightSegment[]>(() => {
  if (!props.text || normalizedTokens.value.length === 0) {
    return [{ text: props.text, highlighted: false }]
  }

  const lowerText = props.text.toLowerCase()
  const ranges: Array<{ start: number; end: number }> = []

  normalizedTokens.value.forEach((token) => {
    let searchIndex = 0

    while (searchIndex < lowerText.length) {
      const matchIndex = lowerText.indexOf(token, searchIndex)

      if (matchIndex === -1) {
        break
      }

      ranges.push({ start: matchIndex, end: matchIndex + token.length })
      searchIndex = matchIndex + Math.max(token.length, 1)
    }
  })

  if (ranges.length === 0) {
    return [{ text: props.text, highlighted: false }]
  }

  const mergedRanges = ranges
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .reduce<Array<{ start: number; end: number }>>((result, range) => {
      const previous = result.at(-1)

      if (!previous || range.start > previous.end) {
        result.push({ ...range })
        return result
      }

      previous.end = Math.max(previous.end, range.end)
      return result
    }, [])

  const nextSegments: HighlightSegment[] = []
  let cursor = 0

  mergedRanges.forEach((range) => {
    if (range.start > cursor) {
      nextSegments.push({
        text: props.text.slice(cursor, range.start),
        highlighted: false,
      })
    }

    nextSegments.push({
      text: props.text.slice(range.start, range.end),
      highlighted: true,
    })
    cursor = range.end
  })

  if (cursor < props.text.length) {
    nextSegments.push({
      text: props.text.slice(cursor),
      highlighted: false,
    })
  }

  return nextSegments
})
</script>

<template>
  <span>
    <template v-for="(segment, index) in segments" :key="`${segment.text}-${index}`">
      <mark
        v-if="segment.highlighted"
        class="rounded bg-badge-duration px-0.5 text-badge-duration-text"
      >
        {{ segment.text }}
      </mark>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>
