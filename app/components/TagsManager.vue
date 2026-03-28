<script setup lang="ts">
import type { FirebaseTagDocument } from '~/utils/worklog-firebase'
import { APP_CHIP_ROW_STATIC_CLASS_NAME } from '~/utils/app-field'
import { toTags } from '~/utils/worklog-firebase'
import { getWorklogErrorMessage, sortNamedEntities } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { tagsCollection } = useFirestoreCollections()
const allTags = useCollection(tagsCollection)

const mutationErrorMessage = ref('')

const sortedAllTags = computed(() => {
  return sortNamedEntities(toTags(allTags.value as FirebaseTagDocument[]))
})

const newTagName = ref('')

const createTagDocument = async () => {
  mutationErrorMessage.value = ''

  try {
    await repositories.tags.create({ name: newTagName.value })
    newTagName.value = ''
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to create tag.')
  }
}

const cancelCreateAndLoseFocus = (event?: KeyboardEvent) => {
  newTagName.value = ''
  mutationErrorMessage.value = ''
  const target = event?.target
  if (target instanceof HTMLInputElement) {
    target.blur()
  }
}
</script>

<template>
  <ContainerCard
    as="section"
    class="mb-4 w-full rounded-sm py-4"
    padding="comfortable"
    style="width: 100%; min-width: 100%"
    variant="gradient"
  >
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Tags</div>
        <div class="mt-1 text-2xl font-bold text-text">Manage tags</div>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <TagsManagerTag
        v-for="item in sortedAllTags"
        :id="item.id"
        :key="item.id"
        :name="item.name"
        :slug="item.slug"
      />
    </div>
    <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div :class="[APP_CHIP_ROW_STATIC_CLASS_NAME, 'w-full min-w-0 py-1.5 sm:max-w-[200px]']">
        <input
          v-model="newTagName"
          type="text"
          class="min-w-0 flex-1 bg-transparent font-bold text-text outline-none placeholder:text-text-subtle/55 focus:ring-0"
          aria-label="New tag name"
          placeholder="New tag name"
          @input="mutationErrorMessage = ''"
          @keyup.enter="createTagDocument"
          @keyup.esc="cancelCreateAndLoseFocus($event)"
        />
      </div>
      <AppButton
        class="w-full shrink-0 sm:w-auto"
        size="sm"
        variant="primary"
        @click="createTagDocument"
      >
        Add New Tag
      </AppButton>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </ContainerCard>
</template>
