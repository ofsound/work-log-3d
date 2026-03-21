import { createError, getRouterParam } from 'h3'

import { createFirestorePublishDependencies } from '../../../utils/public-reports-firestore'
import { PublicReportError, publishReportDraft } from '../../../utils/public-reports'
import { requireServerUser } from '../../../utils/server-auth'

export default defineEventHandler(async (event) => {
  const user = await requireServerUser(event)
  const reportId = getRouterParam(event, 'id')

  if (!reportId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Report id is required.',
    })
  }

  try {
    return await publishReportDraft(createFirestorePublishDependencies(), {
      uid: user.uid,
      reportId,
    })
  } catch (error: unknown) {
    if (error instanceof PublicReportError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
