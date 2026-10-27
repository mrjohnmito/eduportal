import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const BodySchema = z.object({
  schoolId: z.string().uuid().optional(),
  email: z.string().email(),
  password: z.string().min(1).max(200),
})

const isWeakPassword = (err: { message?: string; code?: string }) =>
  err.code === 'weak_password' || /weak|easy to guess|pwned|leaked/i.test(err.message ?? '')

const weakPasswordResponse = () =>
  new Response(JSON.stringify({ valid: false, error: 'weak_password' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { schoolId, email, password } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let query = supabase
      .from('school_credentials')
      .select('school_id, admin_email, admin_password_hash')
    query = schoolId
      ? query.eq('school_id', schoolId)
      : query.ilike('admin_email', email.trim())
    const { data, error } = await query.maybeSingle()

    if (error || !data || !data.admin_email || !data.admin_password_hash) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let storedPassword = ''
    try { storedPassword = atob(data.admin_password_hash) } catch { storedPassword = '' }

    const valid =
      data.admin_email.trim().toLowerCase() === email.trim().toLowerCase() &&
      storedPassword === password

    if (valid) {
      let authUserId: string | undefined
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(), password, email_confirm: true,
      })
      if (createError && isWeakPassword(createError)) return weakPasswordResponse()
      if (createError && !createError.message.toLowerCase().includes('already')) throw createError
      authUserId = created.user?.id
      if (!authUserId) {
        const { data: users, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        if (listError) throw listError
        authUserId = users.users.find(user => user.email?.toLowerCase() === email.trim().toLowerCase())?.id
      }
      if (!authUserId) throw new Error('Unable to provision admin account')

      const { error: passwordError } = await supabase.auth.admin.updateUserById(authUserId, { password })
      if (passwordError && isWeakPassword(passwordError)) return weakPasswordResponse()
      if (passwordError) throw passwordError
      const { error: roleError } = await supabase.from('user_roles').upsert({
        user_id: authUserId, role: 'admin', school_id: data.school_id,
      }, { onConflict: 'user_id,role' })
      if (roleError) throw roleError
    }

    return new Response(JSON.stringify({ valid, schoolId: valid ? data.school_id : null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('verify-school-admin failed:', err instanceof Error ? err.message : err)
    return new Response(JSON.stringify({ valid: false, error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
