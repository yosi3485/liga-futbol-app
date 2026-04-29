import { createClient } from '@supabase/supabase-js'

type Body = {
  email?: string
  password?: string
  playerId?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const serviceRoleKey = config.supabaseServiceRoleKey
  const anonKey = config.public.supabaseKey

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Falta configurar SUPABASE_URL / SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY en el servidor.'
    })
  }

  const body = (await readBody(event)) as Body
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '').trim()
  const playerId = String(body.playerId ?? '').trim()

  if (!email || !password || !playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'email, password y playerId son requeridos.'
    })
  }

  const authHeader = getHeader(event, 'authorization') ?? ''
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length).trim()
    : ''

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Authorization token.' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Verify caller is authenticated and admin.
  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(token)
  if (callerError) {
    throw createError({ statusCode: 401, statusMessage: callerError.message })
  }
  const callerId = caller.user?.id
  if (!callerId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session.' })
  }

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: profileError.message })
  }

  if (callerProfile?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Create user without sending confirmation email (prevents email rate-limit).
  const { data: created, error: createErrorRes } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (createErrorRes) {
    throw createError({ statusCode: 400, statusMessage: createErrorRes.message })
  }

  const userId = created.user?.id
  if (!userId) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo crear el usuario.' })
  }

  // Link profile -> player
  const { error: linkError } = await supabaseAdmin
    .from('profiles')
    .update({ player_id: playerId, email })
    .eq('id', userId)

  if (linkError) {
    throw createError({ statusCode: 500, statusMessage: linkError.message })
  }

  return { ok: true, userId }
})

