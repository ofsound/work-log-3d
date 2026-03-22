import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

import {
  fetchLegacyImportDataset,
  LEGACY_IMPORT_EMAIL,
  materializeLegacyImportedTimeBoxes,
  resolveLegacyEntityImports,
  summarizeLegacyDataset,
} from './import-legacy-data'
import { getProjectDefaultMetadata } from '../shared/worklog/projects'

process.loadEnvFile?.('.env')

type ImportLegacyOptions = {
  dryRun: boolean
  email: string
}

const helpText = `
Usage: npm run import:legacy -- [options]

Options:
  --email <address>      Auth user email to target (default: ${LEGACY_IMPORT_EMAIL})
  --dry-run              Print a summary without touching Firebase
  --help                 Show this message
`.trim()

const parseArgs = (argv: string[]): ImportLegacyOptions => {
  const options: ImportLegacyOptions = {
    dryRun: false,
    email: LEGACY_IMPORT_EMAIL,
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

const formatSummaryDate = (value: Date | null) => {
  if (!value) {
    return 'n/a'
  }

  return value.toISOString().slice(0, 10)
}

const run = async () => {
  const options = parseArgs(process.argv.slice(2))
  const dataset = await fetchLegacyImportDataset()
  const summary = summarizeLegacyDataset(dataset)

  console.log(
    `Prepared ${summary.projectCount} projects, ${summary.tagCount} tags, and ${summary.timeBoxCount} sessions from ${formatSummaryDate(summary.startDate)} through ${formatSummaryDate(summary.endDate)}.`,
  )

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
  const db = getFirestore()

  const [projectSnapshot, tagSnapshot] = await Promise.all([
    db.collection(`users/${uid}/projects`).get(),
    db.collection(`users/${uid}/tags`).get(),
  ])

  const projectImport = resolveLegacyEntityImports({
    legacyEntities: dataset.projects,
    existingEntities: projectSnapshot.docs.map((document) => ({
      id: document.id,
      name: String(document.get('name') ?? ''),
      slug: String(document.get('slug') ?? ''),
    })),
    collectionName: 'projects',
    label: 'Project',
  })
  const tagImport = resolveLegacyEntityImports({
    legacyEntities: dataset.tags,
    existingEntities: tagSnapshot.docs.map((document) => ({
      id: document.id,
      name: String(document.get('name') ?? ''),
      slug: String(document.get('slug') ?? ''),
    })),
    collectionName: 'tags',
    label: 'Tag',
  })

  const importedTimeBoxes = materializeLegacyImportedTimeBoxes({
    legacyTimeBoxes: dataset.timeBoxes,
    projectIdByLegacyId: projectImport.idByLegacyId,
    tagIdByLegacyId: tagImport.idByLegacyId,
  })

  const importedTimeBoxSnapshots = await db.getAll(
    ...importedTimeBoxes.map(({ id }) => db.doc(`users/${uid}/timeBoxes/${id}`)),
  )
  const existingImportedTimeBoxCount = importedTimeBoxSnapshots.filter(
    (snapshot) => snapshot.exists,
  ).length

  console.log(`Target user: ${options.email} (uid: ${uid})`)
  console.log(
    `Projects: ${projectImport.reusedCount} reused, ${projectImport.createdCount} created`,
  )
  console.log(`Tags: ${tagImport.reusedCount} reused, ${tagImport.createdCount} created`)
  console.log(
    `Sessions: ${existingImportedTimeBoxCount} already imported, ${importedTimeBoxes.length - existingImportedTimeBoxCount} new, ${importedTimeBoxes.length} total upserts`,
  )

  if (options.dryRun) {
    console.log('Dry run only. No Firebase writes were performed.')
    return
  }

  const batch = db.batch()

  projectImport.entitiesToCreate.forEach((project) => {
    batch.set(db.doc(`users/${uid}/projects/${project.id}`), {
      name: project.name,
      slug: project.slug,
      ...getProjectDefaultMetadata(projectImport.entitiesToCreate.indexOf(project)),
    })
  })
  tagImport.entitiesToCreate.forEach((tag) => {
    batch.set(db.doc(`users/${uid}/tags/${tag.id}`), {
      name: tag.name,
      slug: tag.slug,
    })
  })
  importedTimeBoxes.forEach(({ id, input }) => {
    batch.set(db.doc(`users/${uid}/timeBoxes/${id}`), {
      ...input,
      startTime: Timestamp.fromDate(input.startTime),
      endTime: Timestamp.fromDate(input.endTime),
    })
  })

  await batch.commit()

  console.log(`Imported legacy worklog into ${options.email}.`)
}

run().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown error while importing legacy worklog.'
  console.error(message)
  process.exitCode = 1
})
