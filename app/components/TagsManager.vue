<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'

import { addDoc } from 'firebase/firestore'

const { tagsCollection } = useFirestoreCollections()
const allTags = useCollection(tagsCollection)

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

const myInput: Ref<HTMLInputElement | null> = ref(null)

const sortedAllTags = computed(() => {
  return allTags.value.slice().sort((a, b) => {
    const aValue = a['name']
    const bValue = b['name']

    if (typeof aValue === 'string') {
      return aValue.localeCompare(bValue)
    }
    return aValue - bValue
  })
})

const newTagName = ref('')

const createTagDocument = async () => {
  if (newTagName.value) {
    try {
      const docRef = await addDoc(tagsCollection, {
        name: newTagName.value,
        slug: slugify(newTagName.value),
      })
      newTagName.value = ''
      console.log('Document added with ID: ', docRef.id)
    } catch (e) {
      console.error('Error adding document: ', e)
    }
  } else {
    console.error('Name field empty!')
  }
}

const cancelCreateAndLoseFocus = () => {
  newTagName.value = ''
  if (myInput.value) {
    myInput.value.blur()
  }
}
</script>

<template>
  <div class="my-4 rounded-sm border border-gray-400/30 bg-purple-200 px-6 py-4 shadow-md">
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
        class="mr-4 flex-1 bg-white pl-2 font-bold"
        type="text"
        @keyup.enter="createTagDocument"
        @keyup.esc="cancelCreateAndLoseFocus"
      />
      <button
        class="ml-auto block w-max cursor-pointer rounded-md bg-slate-600 px-3 py-1 tracking-wide text-white"
        @click="createTagDocument"
      >
        + Create Tag
      </button>
    </div>
  </div>
</template>
