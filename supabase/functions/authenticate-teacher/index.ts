import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const BodySchema = z.object({
  schoolId: z.string().uuid(),
  accessCode: z.string().min(1).max(50),
})

const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return new Response(JSON.stringify({ valid: false }), { status: 400, headers })

    const { schoolId, accessCode } = parsed.data
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: teacher, error } = await admin
      .from('teachers')
      .select('id, name, school_id, auth_user_id')
      .eq('school_id', schoolId)
      .eq('access_code', accessCode.trim())
      .maybeSingle()

    if (error || !teacher) return new Response(JSON.stringify({ valid: false }), { headers })

    const authEmail = `teacher-${teacher.id}@eduportal.invalid`
    let authUserId = teacher.auth_user_id
    if (!authUserId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: authEmail,
        password: accessCode.trim(),
        email_confirm: true,
        user_metadata: { teacher_id: teacher.id, teacher_name: teacher.name, school_id: schoolId },
      })
      if (createError && !createError.message.toLowerCase().includes('already')) {
        throw createError
      }
      authUserId = created.user?.id
      if (!authUserId) {
        const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
        if (listError) throw listError
        authUserId = users.users.find(user => user.email === authEmail)?.id
      }
      if (!authUserId) throw new Error('Unable to provision teacher account')

      const { error: updateError } = await admin
        .from('teachers')
        .update({ auth_user_id: authUserId })
        .eq('id', teacher.id)
        .eq('school_id', schoolId)
      if (updateError) throw updateError
    } else {
      const { error: passwordError } = await admin.auth.admin.updateUserById(authUserId, {
        password: accessCode.trim(),
        user_metadata: { teacher_id: teacher.id, teacher_name: teacher.name, school_id: schoolId },
      })
      if (passwordError) throw passwordError
    }

    const { error: roleError } = await admin.from('user_roles').upsert({
      user_id: authUserId, role: 'teacher', school_id: schoolId,
    }, { onConflict: 'user_id,role' })
    if (roleError) throw roleError

    return new Response(JSON.stringify({
      valid: true, email: authEmail, teacher: { id: teacher.id, name: teacher.name },
    }), { headers })
  } catch {
    return new Response(JSON.stringify({ valid: false, error: 'Server error' }), { status: 500, headers })
  }
})