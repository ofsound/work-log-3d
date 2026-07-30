import { createAccountBackup } from '../../utils/account-backup'
import { requireServerUser } from '../../utils/server-auth'

export default defineEventHandler(async (event) => {
  const user = await requireServerUser(event)
  const runtimeConfig = useRuntimeConfig(event)

  setHeader(event, 'cache-control', 'private, no-store')

  return createAccountBackup({
    uid: user.uid,
    email: typeof user.email === 'string' ? user.email : null,
    displayName: typeof user.name === 'string' ? user.name : null,
    photoUrl: typeof user.picture === 'string' ? user.picture : null,
    appVersion: String(runtimeConfig.public.appVersion ?? ''),
  })
})
