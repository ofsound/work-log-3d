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
  <div
    class="my-4 w-full rounded-sm border border-border-subtle bg-panel-tag px-6 py-4 shadow-panel"
    style="width: 100%; min-width: 100%"
  >
    <div class="mb-2 text-center text-xl font-bold uppercase">Tags</div>
    <TagsManagerTag
      v-for="item in sortedAllTags"
      :id="item.id"
      :key="item.id"
      :name="item.name"
      :slug="item.slug"
    />
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
      <button
        class="ml-auto block w-max cursor-pointer rounded-md bg-button-primary px-3 py-1 tracking-wide text-button-primary-text hover:bg-button-primary-hover"
        @click="createTagDocument"
      >
        + Create Tag
      </button>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
