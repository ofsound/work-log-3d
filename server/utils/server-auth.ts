import { createError, getHeader, type H3Event } from 'h3'

import { getAdminAuth } from './firebase-admin'

const getBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return ''
  }

  return authorizationHeader.slice('Bearer '.length).trim()
}

export const requireServerUser = async (event: H3Event) => {
  const token = getBearerToken(getHeader(event, 'authorization'))

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.',
    })
  }

  try {
    return await getAdminAuth().verifyIdToken(token)
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.',
    })
  }
}
