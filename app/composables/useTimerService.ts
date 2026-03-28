import { deleteDoc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore'

import type { DocumentData, DocumentReference, Unsubscribe } from 'firebase/firestore'
import type { ActiveTimerDraftInput, ActiveTimerState } from '~~/shared/worklog'
import {
  addCountdownSeconds,
  applyActiveTimerDraft,
  createIdleActiveTimerState,
  getTimerSnapshot,
  pauseTimer,
  replaceActiveTimerState,
  resumeTimer,
  startCountdownTimer,
  startCountupTimer,
  stopTimer,
  syncActiveTimerState,
} from '~~/shared/worklog'
import type { FirebaseActiveTimerDocument } from '~/utils/worklog-firebase'
import { toActiveTimer, toActiveTimerPayload } from '~/utils/worklog-firebase'

const ACTIVE_TIMER_DEVICE_ID_STORAGE_KEY = 'work-log:active-timer-device-id'

let timerInterval: number | null = null
let activeTimerSubscription: Unsubscribe | null = null
let activeTimerDocumentRef: DocumentReference<DocumentData> | null = null
let timerServiceInitialized = false
let localMutationSequence = 0

const getStoredDeviceId = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  const existing = window.localStorage.getItem(ACTIVE_TIMER_DEVICE_ID_STORAGE_KEY)

  if (existing) {
    return existing
  }

  const next =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(ACTIVE_TIMER_DEVICE_ID_STORAGE_KEY, next)

  return next
}

const stampLocalMutation = (state: ActiveTimerState, nowMs: number, deviceId: string) => {
  localMutationSequence += 1

  return {
    ...state,
    updatedAtMs: nowMs,
    updatedByDeviceId: deviceId,
    mutationId: localMutationSequence,
  }
}

export function useTimerService() {
  const firebaseApp = useFirebaseApp()
  const db = getFirestore(firebaseApp)
  const currentUser = useCurrentUser()
  const { activeTimerDocument } = useFirestoreCollections()

  const timerState = useState<ActiveTimerState>('active-timer-state', createIdleActiveTimerState)
  const timerNow = useState('active-timer-now', () => Date.now())
  const isReady = useState('active-timer-ready', () => currentUser.value !== undefined)
  const deviceId = useState('active-timer-device-id', getStoredDeviceId)
  const isPersistentReady = computed(
    () => isReady.value && Boolean(currentUser.value) && activeTimerDocument.value !== null,
  )

  const persistActiveTimerState = async (nextState: ActiveTimerState) => {
    if (!activeTimerDocumentRef) {
      return
    }

    if (nextState.status === 'idle') {
      await deleteDoc(activeTimerDocumentRef)
      return
    }

    await setDoc(activeTimerDocumentRef, toActiveTimerPayload(nextState))
  }

  const clearLocalSubscription = () => {
    activeTimerSubscription?.()
    activeTimerSubscription = null
  }

  const ensureInterval = () => {
    if (typeof window === 'undefined' || timerInterval !== null) {
      return
    }

    timerInterval = window.setInterval(() => {
      timerNow.value = Date.now()
      const nextState = syncActiveTimerState(timerState.value, timerNow.value)

      if (nextState === timerState.value) {
        return
      }

      const stampedState = stampLocalMutation(nextState, timerNow.value, deviceId.value)
      timerState.value = stampedState
      void persistActiveTimerState(stampedState).catch((error) => {
        console.warn('[worklog] unable to persist active timer completion state', error)
      })
    }, 250)
  }

  const applyMutation = async (
    mutate: (state: ActiveTimerState, nowMs: number) => ActiveTimerState,
  ) => {
    timerNow.value = Date.now()
    const currentState = syncActiveTimerState(timerState.value, timerNow.value)
    const nextState = mutate(currentState, timerNow.value)

    timerState.value =
      nextState.status === 'idle'
        ? createIdleActiveTimerState()
        : stampLocalMutation(nextState, timerNow.value, deviceId.value)

    try {
      await persistActiveTimerState(timerState.value)
    } catch (error) {
      console.warn('[worklog] unable to persist active timer state', error)
    }
  }

  if (import.meta.client && !timerServiceInitialized) {
    timerServiceInitialized = true
    ensureInterval()

    watch(
      [() => currentUser.value, () => activeTimerDocument.value],
      ([user, documentReference]) => {
        timerNow.value = Date.now()
        activeTimerDocumentRef = documentReference
        clearLocalSubscription()

        if (!documentReference) {
          timerState.value = createIdleActiveTimerState()
          isReady.value = user !== undefined
          return
        }

        isReady.value = false
        activeTimerSubscription = onSnapshot(
          documentReference,
          (snapshot) => {
            timerNow.value = Date.now()
            timerState.value = snapshot.exists()
              ? toActiveTimer(snapshot.data() as FirebaseActiveTimerDocument)
              : createIdleActiveTimerState()
            isReady.value = true
          },
          (error) => {
            console.warn('[worklog] unable to subscribe to active timer', error)
            isReady.value = true
          },
        )
      },
      { immediate: true },
    )
  }

  const startCountup = async (initialDraft: ActiveTimerDraftInput = {}) => {
    await applyMutation((_state, nowMs) =>
      applyActiveTimerDraft(
        replaceActiveTimerState(createIdleActiveTimerState(), startCountupTimer(nowMs)),
        initialDraft,
      ),
    )
  }

  const startCountdownSeconds = async (
    durationSeconds: number,
    initialDraft: ActiveTimerDraftInput = {},
  ) => {
    await applyMutation((_state, nowMs) =>
      applyActiveTimerDraft(
        replaceActiveTimerState(
          createIdleActiveTimerState(),
          startCountdownTimer(durationSeconds, nowMs),
        ),
        initialDraft,
      ),
    )
  }

  const startCountdown = async (
    durationMinutes: number,
    initialDraft: ActiveTimerDraftInput = {},
  ) => {
    await startCountdownSeconds(durationMinutes * 60, initialDraft)
  }

  const pause = async () => {
    await applyMutation((state, nowMs) => replaceActiveTimerState(state, pauseTimer(state, nowMs)))
  }

  const resume = async () => {
    await applyMutation((state, nowMs) => replaceActiveTimerState(state, resumeTimer(state, nowMs)))
  }

  const addCountdownMinutes = async (minutes: number) => {
    const durationSeconds = minutes * 60

    await applyMutation((state, nowMs) =>
      replaceActiveTimerState(state, addCountdownSeconds(state, durationSeconds, nowMs)),
    )
  }

  const stop = async () => {
    await applyMutation((state, nowMs) => replaceActiveTimerState(state, stopTimer(state, nowMs)))
  }

  const cancel = async () => {
    await applyMutation(() => createIdleActiveTimerState())
  }

  const setDraftContext = async (draft: ActiveTimerDraftInput) => {
    await applyMutation((state) => {
      if (state.status === 'idle') {
        return state
      }

      return applyActiveTimerDraft(state, draft)
    })
  }

  const snapshot = computed(() => getTimerSnapshot(timerState.value, timerNow.value))

  return {
    isReady,
    isPersistentReady,
    timerState,
    snapshot,
    startCountup,
    startCountdown,
    startCountdownSeconds,
    addCountdownMinutes,
    pause,
    resume,
    stop,
    cancel,
    setDraftContext,
    firestore: db,
  }
}
