<script setup lang="ts">
import { doc } from 'firebase/firestore'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'

import type { FirebaseDailyNoteDocument } from '~/utils/worklog-firebase'
import { toDailyNote } from '~/utils/worklog-firebase'
import {
  cloneDailyNoteContent,
  createEmptyDailyNoteContent,
  type DailyNoteContentNode,
  getWorklogErrorMessage,
} from '~~/shared/worklog'

const props = defineProps({
  active: { type: Boolean, default: true },
  dateKey: { type: String, required: true },
})

const repositories = useWorklogRepository()
const { dailyNotesCollection } = useFirestoreCollections()

const AUTO_SAVE_DELAY_MS = 1200

const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const saveErrorMessage = ref('')
const isEnsuringNote = ref(false)
const isApplyingRemoteContent = ref(false)
const hasQueuedSave = ref(false)
const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const currentEditorJson = ref(JSON.stringify(createEmptyDailyNoteContent()))
const syncedEditorJson = ref(JSON.stringify(createEmptyDailyNoteContent()))
const lastSavedAt = ref<Date | null>(null)
const pendingRemoteContent = ref<DailyNoteContentNode | null>(null)
const currentSavePromise = ref<Promise<void> | null>(null)

const isDirty = computed(() => currentEditorJson.value !== syncedEditorJson.value)
const noteDocumentSource = computed(() =>
  dailyNotesCollection.value ? doc(dailyNotesCollection.value, props.dateKey) : null,
)
const rawDailyNote = useDocument(noteDocumentSource)

const editor = useEditor({
  editable: props.active,
  content: createEmptyDailyNoteContent(),
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
      protocols: ['http', 'https', 'mailto'],
    }),
    TaskList,
    TaskItem.configure({
      nested: false,
    }),
    Placeholder.configure({
      placeholder: 'Capture the day, decisions, follow-ups, and anything you want to remember.',
    }),
  ],
  editorProps: {
    attributes: {
      class:
        'daily-scratchpad-editor min-h-88 rounded-2xl border border-border-subtle bg-panel-editor px-4 py-4 font-data text-sm text-text shadow-panel focus:outline-none',
    },
  },
  onUpdate: ({ editor: currentEditor }) => {
    if (isApplyingRemoteContent.value) {
      return
    }

    currentEditorJson.value = JSON.stringify(currentEditor.getJSON())
    saveStatus.value = isDirty.value ? 'idle' : saveStatus.value
    saveErrorMessage.value = ''
    scheduleAutoSave()
  },
})

const clearSaveTimer = () => {
  if (!saveTimer.value) {
    return
  }

  clearTimeout(saveTimer.value)
  saveTimer.value = null
}

const setEditorContent = (content: DailyNoteContentNode) => {
  const nextContent = cloneDailyNoteContent(content)
  const nextJson = JSON.stringify(nextContent)

  isApplyingRemoteContent.value = true
  editor.value?.commands.setContent(nextContent, { emitUpdate: false })
  currentEditorJson.value = nextJson
  syncedEditorJson.value = nextJson
  isApplyingRemoteContent.value = false
}

const applyRemoteNote = (content: DailyNoteContentNode, updatedAt: Date | null) => {
  pendingRemoteContent.value = null
  setEditorContent(content)
  lastSavedAt.value = updatedAt
  saveStatus.value = updatedAt ? 'saved' : 'idle'
  saveErrorMessage.value = ''
}

const persistEditorContent = async ({ force }: { force: boolean }) => {
  clearSaveTimer()

  if (!editor.value) {
    return
  }

  if (!force && !isDirty.value) {
    return
  }

  if (currentSavePromise.value) {
    hasQueuedSave.value = true
    await currentSavePromise.value
    return
  }

  const content = cloneDailyNoteContent(editor.value.getJSON() as DailyNoteContentNode)
  const contentJson = JSON.stringify(content)

  saveStatus.value = 'saving'
  saveErrorMessage.value = ''

  const savePromise = repositories.dailyNotes
    .upsert(props.dateKey, { content })
    .then(() => {
      syncedEditorJson.value = contentJson
      currentEditorJson.value = contentJson
      lastSavedAt.value = new Date()
      saveStatus.value = 'saved'
    })
    .catch((error) => {
      saveStatus.value = 'error'
      saveErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save the scratchpad.')
    })
    .finally(async () => {
      currentSavePromise.value = null

      if (hasQueuedSave.value) {
        hasQueuedSave.value = false
        await persistEditorContent({ force: false })
      }
    })

  currentSavePromise.value = savePromise
  await savePromise
}

const scheduleAutoSave = () => {
  clearSaveTimer()

  if (!isDirty.value) {
    return
  }

  saveTimer.value = setTimeout(() => {
    void persistEditorContent({ force: false })
  }, AUTO_SAVE_DELAY_MS)
}

const ensureNoteDocument = async () => {
  if (isEnsuringNote.value) {
    return
  }

  isEnsuringNote.value = true

  try {
    await repositories.dailyNotes.ensure(props.dateKey)
  } catch (error) {
    saveStatus.value = 'error'
    saveErrorMessage.value = getWorklogErrorMessage(error, 'Unable to load the scratchpad.')
  } finally {
    isEnsuringNote.value = false
  }
}

const flushPendingChanges = async () => {
  clearSaveTimer()
  await persistEditorContent({ force: true })
}

const openLinkPrompt = () => {
  if (!editor.value || !import.meta.client) {
    return
  }

  const previousHref = editor.value.getAttributes('link').href as string | undefined
  const nextHref = window.prompt('Link URL', previousHref ?? 'https://')

  if (nextHref === null) {
    return
  }

  const normalizedHref = nextHref.trim()

  if (!normalizedHref) {
    editor.value.chain().focus().unsetLink().run()
    return
  }

  editor.value.chain().focus().extendMarkRange('link').setLink({ href: normalizedHref }).run()
}

const toolbarButtonClass = (isActive: boolean) =>
  [
    'rounded-md border px-2.5 py-1 text-xs font-semibold transition',
    isActive
      ? 'border-link bg-link/10 text-link'
      : 'border-border-subtle bg-surface text-text-muted hover:bg-surface-muted hover:text-text',
  ].join(' ')

const savedStatusLabel = computed(() => {
  if (!lastSavedAt.value) {
    return 'Saved'
  }

  return `Saved ${lastSavedAt.value.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`
})

watch(
  () => props.active,
  (active) => {
    editor.value?.setEditable(active)

    if (!active) {
      void flushPendingChanges()
    }
  },
)

watch(
  () => props.dateKey,
  async () => {
    pendingRemoteContent.value = null
    clearSaveTimer()
    saveErrorMessage.value = ''
    saveStatus.value = 'idle'
    lastSavedAt.value = null
    await ensureNoteDocument()
  },
  { immediate: true },
)

watch(
  rawDailyNote,
  (value) => {
    const nextNote = toDailyNote(
      props.dateKey,
      value as FirebaseDailyNoteDocument | null | undefined,
    )

    if (isDirty.value) {
      pendingRemoteContent.value = nextNote.content
      lastSavedAt.value = nextNote.updatedAt
      return
    }

    applyRemoteNote(nextNote.content, nextNote.updatedAt)
  },
  { immediate: true },
)

watch(editor, (currentEditor) => {
  if (!currentEditor) {
    return
  }

  currentEditor.commands.setContent(JSON.parse(currentEditorJson.value), { emitUpdate: false })
  currentEditor.setEditable(props.active)
})

watch(isDirty, (dirty) => {
  if (dirty || !pendingRemoteContent.value) {
    return
  }

  applyRemoteNote(pendingRemoteContent.value, lastSavedAt.value)
})

onBeforeUnmount(() => {
  clearSaveTimer()
})

defineExpose({
  flushPendingChanges,
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('bold') ?? false)"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        Bold
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('italic') ?? false)"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        Italic
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('heading', { level: 1 }) ?? false)"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('heading', { level: 2 }) ?? false)"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('heading', { level: 3 }) ?? false)"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('bulletList') ?? false)"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        Bullets
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('orderedList') ?? false)"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        Numbered
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('taskList') ?? false)"
        @click="editor?.chain().focus().toggleTaskList().run()"
      >
        Checklist
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(editor?.isActive('link') ?? false)"
        @click="openLinkPrompt"
      >
        Link
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(false)"
        @click="editor?.chain().focus().undo().run()"
      >
        Undo
      </button>
      <button
        type="button"
        :class="toolbarButtonClass(false)"
        @click="editor?.chain().focus().redo().run()"
      >
        Redo
      </button>
    </div>

    <div class="flex items-center justify-between gap-3 text-xs text-text-subtle">
      <div>
        <span v-if="saveStatus === 'saving'">Saving...</span>
        <span v-else-if="saveStatus === 'saved'">{{ savedStatusLabel }}</span>
        <span v-else-if="saveStatus === 'error'">{{ saveErrorMessage }}</span>
        <span v-else-if="isEnsuringNote">Preparing note...</span>
      </div>

      <button
        type="button"
        class="rounded-md border border-button-secondary-border bg-button-secondary px-3 py-1.5 text-xs font-semibold text-button-secondary-text hover:bg-button-secondary-hover disabled:cursor-default disabled:opacity-60"
        :disabled="saveStatus === 'saving' || !isDirty"
        @click="flushPendingChanges"
      >
        Save
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto overscroll-contain pb-4">
      <EditorContent v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
