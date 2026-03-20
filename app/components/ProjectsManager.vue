<script setup lang="ts">
import type { Ref } from 'vue'
import type { FirebaseProjectDocument } from '~/utils/worklog-firebase'
import { toProjects } from '~/utils/worklog-firebase'
import { sortNamedEntities } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { projectsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const myInput: Ref<HTMLInputElement | null> = ref(null)

const sortedAllProjects = computed(() => {
  return sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[]))
})

const newProjectName = ref('')

const createProjectDocument = async () => {
  if (newProjectName.value) {
    try {
      await repositories.projects.create({ name: newProjectName.value })
      newProjectName.value = ''
    } catch (e) {
      console.error('Error adding document: ', e)
    }
  } else {
    console.error('Name field empty!')
  }
}

const cancelCreateAndLoseFocus = () => {
  newProjectName.value = ''
  if (myInput.value) {
    myInput.value.blur()
  }
}
</script>

<template>
  <div class="my-4 rounded-sm border border-gray-400/30 bg-blue-200 px-6 py-4 shadow-md">
    <div class="mb-2 text-center text-xl font-bold uppercase">Projects</div>
    <ProjectsManagerProject
      v-for="item in sortedAllProjects"
      :id="item.id"
      :key="item.id"
      :name="item.name"
      :slug="item.slug"
    />
    <div class="mt-8 flex">
      <input
        ref="myInput"
        v-model="newProjectName"
        class="mr-4 flex-1 bg-white pl-2 font-bold"
        type="text"
        @keyup.enter="createProjectDocument"
        @keyup.esc="cancelCreateAndLoseFocus"
      />
      <button
        class="ml-auto block w-max cursor-pointer rounded-md bg-slate-600 px-3 py-1 tracking-wide text-white"
        @click="createProjectDocument"
      >
        + Create Project
      </button>
    </div>
  </div>
</template>
