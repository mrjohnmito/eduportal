import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const BodySchema = z.object({
  schoolId: z.string().uuid(),
  code: z.string().min(1).max(50),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { schoolId, code } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: school, error } = await supabase
      .from('schools')
      .select('id, school_code, activated_at')
      .eq('id', schoolId)
      .maybeSingle()

    if (error || !school) {
      return new Response(JSON.stringify({ ok: false, error: 'School not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (school.school_code?.toUpperCase() !== code.trim().toUpperCase()) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid code' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!school.activated_at) {
      await supabase
        .from('schools')
        .update({ activated_at: new Date().toISOString() })
        .eq('id', schoolId)
        .is('activated_at', null)
    }

    return new Response(JSON.stringify({ ok: true, activatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
