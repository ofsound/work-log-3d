import { createError, getRouterParam } from 'h3'

import { createFirestorePublishDependencies } from '../../utils/public-reports-firestore'
import { getPublishedReportByToken, PublicReportError } from '../../utils/public-reports'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Share token is required.',
    })
  }

  try {
    return await getPublishedReportByToken(createFirestorePublishDependencies(), token)
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
