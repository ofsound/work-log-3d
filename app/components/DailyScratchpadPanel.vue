<script setup lang="ts">
import { doc } from 'firebase/firestore'
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

const currentUser = useCurrentUser()
const repositories = useWorklogRepository()
const { dailyNotesCollection } = useFirestoreCollections()

const AUTO_SAVE_DELAY_MS = 1200
const RETRYABLE_SCRATCHPAD_ERROR_CODES = new Set([
  'permission-denied',
  'unauthenticated',
  'unavailable',
])
const RETRY_DELAYS_MS = [250, 500, 1000]

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
const canPersistScratchpad = computed(() =>
  Boolean(currentUser.value?.uid && dailyNotesCollection.value),
)
const isDocumentReady = computed(() => Boolean(dailyNotesCollection.value))
const noteDocumentSource = computed(() =>
  dailyNotesCollection.value ? doc(dailyNotesCollection.value, props.dateKey) : null,
)
const rawDailyNote = useDocument(noteDocumentSource)

const wait = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs))

const getScratchpadErrorCode = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code: unknown }).code === 'string'
    ? ((error as { code: string }).code.split('/').at(-1) ?? '')
    : ''

const runScratchpadOperation = async (
  operation: () => Promise<void>,
  fallbackMessage: string,
): Promise<boolean> => {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await operation()
      return true
    } catch (error) {
      const code = getScratchpadErrorCode(error)

      if (attempt < RETRY_DELAYS_MS.length && RETRYABLE_SCRATCHPAD_ERROR_CODES.has(code)) {
        await wait(RETRY_DELAYS_MS[attempt]!)
        continue
      }

      saveStatus.value = 'error'
      saveErrorMessage.value = getWorklogErrorMessage(error, fallbackMessage)
      return false
    }
  }

  return false
}

const editor = useEditor({
  editable: props.active,
  content: createEmptyDailyNoteContent(),
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        autolink: true,
        openOnClick: false,
        protocols: ['http', 'https', 'mailto'],
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: false,
    }),
  ],
  editorProps: {
    attributes: {
      class:
        'daily-scratchpad-editor h-full min-h-full rounded-md border border-input-border bg-input px-4 py-4 font-data text-base text-text focus:outline-none',
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

  if (!editor.value || !canPersistScratchpad.value) {
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

  const savePromise = runScratchpadOperation(
    () => repositories.dailyNotes.upsert(props.dateKey, { content }),
    'Unable to save the scratchpad.',
  )
    .then((saved) => {
      if (!saved) {
        return
      }

      syncedEditorJson.value = contentJson
      currentEditorJson.value = contentJson
      lastSavedAt.value = new Date()
      saveStatus.value = 'saved'
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
  if (!canPersistScratchpad.value) {
    return
  }

  if (isEnsuringNote.value) {
    return
  }

  isEnsuringNote.value = true
  await runScratchpadOperation(
    () => repositories.dailyNotes.ensure(props.dateKey),
    'Unable to load the scratchpad.',
  )
  isEnsuringNote.value = false
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
  () => [props.dateKey, noteDocumentSource.value?.id ?? '', currentUser.value?.uid ?? ''],
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
    if (!isDocumentReady.value) {
      return
    }

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
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center justify-center gap-2">
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
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-1.5 pb-4">
      <EditorContent v-if="editor" class="min-h-0 flex-1" :editor="editor" />
      <div class="flex shrink-0 items-center justify-between gap-3">
        <div class="flex min-h-4 flex-wrap items-center gap-2">
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

        <div class="shrink-0 text-right text-xs text-text-subtle">
          <span v-if="saveStatus === 'saving'">Saving...</span>
          <span v-else-if="saveStatus === 'saved'">{{ savedStatusLabel }}</span>
          <span v-else-if="saveStatus === 'error'">{{ saveErrorMessage }}</span>
          <span v-else-if="isEnsuringNote">Preparing note...</span>
        </div>
      </div>
    </div>
  </div>
</template>
