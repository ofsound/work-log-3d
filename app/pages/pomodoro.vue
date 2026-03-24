<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ layout: 'main-simple' })

await navigateTo('/new', { redirectCode: 301 })
</script>
