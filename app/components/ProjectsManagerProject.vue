<script setup lang="ts">
import { doc, deleteDoc, updateDoc, type DocumentData } from 'firebase/firestore'

import DeleteIcon from '@/icons/DeleteIcon.vue'
import EditIcon from '@/icons/EditIcon.vue'

import type { Ref } from 'vue'

const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()
const timeBoxes = useCollection(timeBoxesCollection)

const props = defineProps({
  name: { type: String, default: undefined },
  slug: { type: String, default: undefined },
  id: { type: String, required: true },
})

const router = useRouter()
const myInput: Ref<HTMLInputElement | null> = ref(null)
const dynamicName = ref(props.name)

const isNameEditMode = ref(false)

const deleteProjectDocument = async () => {
  const confirmed = window.confirm(`Are you sure you want to delete the project: ${props.name}?`)

  if (confirmed) {
    try {
      await deleteDoc(doc(projectsCollection, props.id))
    } catch (e) {
      console.error('Error deleting document: ', e)
    }
  }
}

const renameProjectDocument = async () => {
  try {
    await updateDoc(doc(projectsCollection, props.id), { name: dynamicName.value })
    if (myInput.value) {
      myInput.value.blur()
      isNameEditMode.value = false
    }
  } catch (e) {
    console.error('Error updating document: ', e)
  }
}

const cancelRenameAndLoseFocus = () => {
  if (myInput.value) {
    isNameEditMode.value = false
    myInput.value.blur()
  }
}

const handleBlur = () => {
  dynamicName.value = props.name
}

const projectTimeBoxesTotalDuration = () => {
  let projectTotalDuration = 0

  const projectTimeBoxes = timeBoxes.value.filter((timeBox) => timeBox.project === props.id)

  projectTimeBoxes.forEach((timeBox: DocumentData) => {
    if (timeBox.endTime && timeBox.startTime) {
      const timeBoxDuration =
        (timeBox.endTime.toDate().valueOf() - timeBox.startTime.toDate().valueOf()) / 60000
      projectTotalDuration += timeBoxDuration
    }
  })

  const { hours, minutes } = formatMinutesToHoursAndMinutes(projectTotalDuration)

  if (hours > 0) {
    return hours + minutes
  } else {
    return minutes
  }
}

watch(
  () => isNameEditMode.value,
  (newValue) => {
    if (newValue && myInput.value) {
      myInput.value.focus()
    }
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="flex gap-2 border-b border-black/20 py-1">
    <input
      v-if="isNameEditMode"
      ref="myInput"
      v-model="dynamicName"
      type="text"
      class="flex-1 p-1 font-bold hover:underline focus:bg-white focus:no-underline!"
      @keyup.enter="renameProjectDocument"
      @keyup.esc="cancelRenameAndLoseFocus"
      @blur="handleBlur"
    />
    <button
      v-if="!isNameEditMode"
      class="flex-1 cursor-pointer p-1 text-left font-bold hover:underline"
      @click="router.push(`/project/${slug}`)"
    >
      {{ dynamicName }}
    </button>
    <button
      class="relative top-1 mt-1.5 mb-3 ml-4 w-max cursor-pointer self-start rounded-md bg-zinc-100 px-1.5 py-0.5 pt-px font-data text-xs tracking-wide text-black"
    >
      {{ projectTimeBoxesTotalDuration() }} hrs
    </button>
    <button class="cursor-pointer px-1" @click="isNameEditMode = !isNameEditMode">
      <EditIcon />
    </button>
    <button class="cursor-pointer px-1" @click="deleteProjectDocument">
      <DeleteIcon />
    </button>
  </div>
</template>
