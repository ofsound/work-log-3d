<script setup lang="ts">
import type { Ref } from 'vue'
import type { FirebaseProjectDocument } from '~/utils/worklog-firebase'
import { toProjects } from '~/utils/worklog-firebase'
import { getWorklogErrorMessage, sortNamedEntities } from '~~/shared/worklog'

const repositories = useWorklogRepository()
const { projectsCollection } = useFirestoreCollections()
const allProjects = useCollection(projectsCollection)
const myInput: Ref<HTMLInputElement | null> = ref(null)
const mutationErrorMessage = ref('')

const sortedAllProjects = computed(() => {
  return sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[]))
})

const newProjectName = ref('')

const createProjectDocument = async () => {
  mutationErrorMessage.value = ''

  try {
    await repositories.projects.create({ name: newProjectName.value })
    newProjectName.value = ''
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to create project.')
  }
}

const cancelCreateAndLoseFocus = () => {
  newProjectName.value = ''
  mutationErrorMessage.value = ''
  if (myInput.value) {
    myInput.value.blur()
  }
}
</script>

<template>
  <div class="my-4 rounded-sm border border-border-subtle bg-panel-project px-6 py-4 shadow-panel">
    <div class="mb-2 text-center text-xl font-bold uppercase">Projects</div>
    <ProjectsManagerProject
      v-for="item in sortedAllProjects"
      :id="item.id"
      :key="item.id"
      :name="item.name"
    />
    <div class="mt-8 flex">
      <input
        ref="myInput"
        v-model="newProjectName"
        class="mr-4 flex-1 bg-input pl-2 font-bold text-text outline-none"
        type="text"
        @input="mutationErrorMessage = ''"
        @keyup.enter="createProjectDocument"
        @keyup.esc="cancelCreateAndLoseFocus"
      />
      <button
        class="ml-auto block w-max cursor-pointer rounded-md bg-button-primary px-3 py-1 tracking-wide text-button-primary-text hover:bg-button-primary-hover"
        @click="createProjectDocument"
      >
        + Create Project
      </button>
    </div>
    <p v-if="mutationErrorMessage" class="mt-3 text-sm text-danger">
      {{ mutationErrorMessage }}
    </p>
  </div>
</template>
