import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { getProjectDefaultMetadata } from '../shared/worklog/projects'

import {
  buildDemoSeedDataset,
  DEFAULT_DEMO_SEED,
  DEMO_SEED_EMAIL,
  getUserWorklogCollectionPaths,
  groupDemoSessionsByDay,
  materializeDemoTimeBoxes,
} from './seed-demo-data'

type SeedDemoOptions = {
  dryRun: boolean
  email: string
  endDate: Date
  endDateInput: string
  seed: number
}

const helpText = `
Usage: npm run seed:demo -- [options]

Options:
  --email <address>      Auth user email to target (default: ${DEMO_SEED_EMAIL})
  --end-date <YYYY-MM-DD>
                         Last local day to include in the 14-day dataset (default: today)
  --seed <number>        Numeric seed for deterministic generation (default: ${DEFAULT_DEMO_SEED})
  --dry-run              Print a summary without touching Firebase
  --help                 Show this message
`.trim()

const parseLocalDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --end-date "${value}". Use YYYY-MM-DD.`)
  }

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid --end-date "${value}".`)
  }

  return date
}

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseArgs = (argv: string[]): SeedDemoOptions => {
  const options: SeedDemoOptions = {
    dryRun: false,
    email: DEMO_SEED_EMAIL,
    endDate: new Date(),
    endDateInput: formatDateInput(new Date()),
    seed: DEFAULT_DEMO_SEED,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    switch (arg) {
      case '--dry-run':
        options.dryRun = true
        break
      case '--email': {
        const value = argv[index + 1]
        if (!value) {
          throw new Error('Missing value for --email.')
        }
        options.email = value
        index += 1
        break
      }
      case '--end-date': {
        const value = argv[index + 1]
        if (!value) {
          throw new Error('Missing value for --end-date.')
        }
        options.endDate = parseLocalDateInput(value)
        options.endDateInput = value
        index += 1
        break
      }
      case '--seed': {
        const value = argv[index + 1]
        if (!value) {
          throw new Error('Missing value for --seed.')
        }
        const seed = Number.parseInt(value, 10)
        if (!Number.isInteger(seed)) {
          throw new Error(`Invalid --seed "${value}".`)
        }
        options.seed = seed
        index += 1
        break
      }
      case '--help':
      case '-h':
        console.log(helpText)
        process.exit(0)
        break
      default:
        throw new Error(`Unknown argument "${arg}".`)
    }
  }

  return options
}

const summarizeDataset = (dataset: ReturnType<typeof buildDemoSeedDataset>) => {
  const groupedDays = groupDemoSessionsByDay(dataset.sessions)
  const totalMinutes = dataset.sessions.reduce(
    (sum, session) => sum + (session.endTime.getTime() - session.startTime.getTime()) / 60_000,
    0,
  )

  console.log(
    `Prepared ${dataset.projects.length} projects, ${dataset.tags.length} tags, and ${dataset.sessions.length} sessions across ${groupedDays.length} days (${Math.round(totalMinutes / 60)} total hours).`,
  )
  groupedDays.forEach(({ day, sessions }) => {
    const dayMinutes = sessions.reduce(
      (sum, session) => sum + (session.endTime.getTime() - session.startTime.getTime()) / 60_000,
      0,
    )
    console.log(`  ${day}: ${sessions.length} sessions, ${dayMinutes} minutes`)
  })
}

const deleteCollectionDocuments = async (collectionPath: string) => {
  const db = getFirestore()
  const snapshot = await db.collection(collectionPath).get()

  if (snapshot.empty) {
    return 0
  }

  const writer = db.bulkWriter()
  snapshot.docs.forEach((document) => {
    writer.delete(document.ref)
  })
  await writer.close()

  return snapshot.size
}

const seedNamedEntities = async ({
  uid,
  collectionName,
  entities,
}: {
  uid: string
  collectionName: 'projects' | 'tags'
  entities:
    | ReturnType<typeof buildDemoSeedDataset>['projects']
    | ReturnType<typeof buildDemoSeedDataset>['tags']
}) => {
  const db = getFirestore()
  const batch = db.batch()
  const idByKey: Record<string, string> = {}

  entities.forEach((entity) => {
    const reference = db.collection(`users/${uid}/${collectionName}`).doc()
    idByKey[entity.key] = reference.id
    batch.set(reference, {
      name: entity.name,
      slug: entity.slug,
      ...(collectionName === 'projects'
        ? getProjectDefaultMetadata(Object.keys(idByKey).length - 1)
        : {}),
    })
  })

  await batch.commit()

  return idByKey
}

const seedTimeBoxes = async ({
  uid,
  sessions,
  projectIdByKey,
  tagIdByKey,
}: {
  uid: string
  sessions: ReturnType<typeof buildDemoSeedDataset>['sessions']
  projectIdByKey: Record<string, string>
  tagIdByKey: Record<string, string>
}) => {
  const db = getFirestore()
  const batch = db.batch()
  const timeBoxes = materializeDemoTimeBoxes(sessions, {
    projectIdByKey,
    tagIdByKey,
  })

  timeBoxes.forEach((timeBox) => {
    const reference = db.collection(`users/${uid}/timeBoxes`).doc()
    batch.set(reference, timeBox)
  })

  await batch.commit()
}

const run = async () => {
  const options = parseArgs(process.argv.slice(2))
  const dataset = buildDemoSeedDataset({
    endDate: options.endDate,
    seed: options.seed,
  })

  summarizeDataset(dataset)

  if (options.dryRun) {
    console.log('Dry run only. No Firebase writes were performed.')
    return
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId:
        process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_PROJECT_ID ??
        process.env.GOOGLE_CLOUD_PROJECT ??
        process.env.GCLOUD_PROJECT,
    })
  }

  const auth = getAuth()
  const user = await auth.getUserByEmail(options.email)
  const uid = user.uid

  console.log(
    `Resetting demo data for ${options.email} (uid: ${uid}) through ${options.endDateInput} using seed ${options.seed}.`,
  )

  for (const collectionPath of getUserWorklogCollectionPaths(uid)) {
    const deletedCount = await deleteCollectionDocuments(collectionPath)
    console.log(`  Cleared ${deletedCount} documents from ${collectionPath}`)
  }

  const projectIdByKey = await seedNamedEntities({
    uid,
    collectionName: 'projects',
    entities: dataset.projects,
  })
  const tagIdByKey = await seedNamedEntities({
    uid,
    collectionName: 'tags',
    entities: dataset.tags,
  })
  await seedTimeBoxes({
    uid,
    sessions: dataset.sessions,
    projectIdByKey,
    tagIdByKey,
  })

  console.log(
    `Seed complete: ${dataset.projects.length} projects, ${dataset.tags.length} tags, ${dataset.sessions.length} sessions.`,
  )
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error while seeding demo data.'
  console.error(message)
  process.exit(1)
})
