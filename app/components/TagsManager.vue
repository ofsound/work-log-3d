<script setup lang="ts">
import type { Ref } from 'vue'
import type { FirebaseTagDocument } from '~/utils/worklog-firebase'
import { toTags } from '~/utils/worklog-firebase'
import { getWorklogErrorMessage, sortNamedEntities } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { tagsCollection } = useFirestoreCollections()
const allTags = useCollection(tagsCollection)

const myInput: Ref<HTMLInputElement | null> = ref(null)
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

const cancelCreateAndLoseFocus = () => {
  newTagName.value = ''
  mutationErrorMessage.value = ''
  if (myInput.value) {
    myInput.value.blur()
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
    <div class="mb-2 text-center text-xl font-bold uppercase">Tags</div>
    <div class="flex flex-col gap-2">
      <TagsManagerTag
        v-for="item in sortedAllTags"
        :id="item.id"
        :key="item.id"
        :name="item.name"
        :slug="item.slug"
      />
    </div>
    <div class="mt-8 flex">
      <input
        ref="myInput"
        v-model="newTagName"
        class="mr-4 flex-1 bg-input pl-2 font-bold text-text outline-none"
        type="text"
        @input="mutationErrorMessage = ''"
        @keyup.enter="createTagDocument"
        @keyup.esc="cancelCreateAndLoseFocus"
      />
      <AppButton
        class="ml-auto w-max tracking-wide"
        size="sm"
        variant="primary"
        @click="createTagDocument"
      >
        + Create Tag
      </AppButton>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </ContainerCard>
</template>
