import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Resolves the caller from their StudentOS JWT. These functions read and write
// user-owned rows, so the caller has to be proven rather than trusted.
async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { user: null, error: 'Missing Authorization header' }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { user: null, error: 'Invalid session' }
  return { user: data.user, error: null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user, error: authError } = await requireUser(req)
    if (!user) return json({ error: authError }, 401)

    const { action, code, redirectUri, calendarIds } = await req.json()

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (action === 'disconnect') {
      await admin.from('google_calendar_connections').delete().eq('user_id', user.id)
      return json({ ok: true })
    }

    if (action === 'select-calendars') {
      if (!Array.isArray(calendarIds)) return json({ error: 'calendarIds must be an array' }, 400)
      const { error } = await admin
        .from('google_calendar_connections')
        .update({ calendar_ids: calendarIds })
        .eq('user_id', user.id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action !== 'exchange') return json({ error: `Unknown action: ${action}` }, 400)
    if (!code || !redirectUri) return json({ error: 'Missing code or redirectUri' }, 400)

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()

    if (!tokenRes.ok) {
      return json({ error: tokens.error_description || tokens.error || 'Token exchange failed' }, 400)
    }
    // Google only returns a refresh token on the first consent for a given
    // client+account. Without it we cannot sync later, so fail loudly rather
    // than storing a connection that silently expires within the hour.
    if (!tokens.refresh_token) {
      return json({
        error: 'Google did not return a refresh token. Revoke StudentOS at myaccount.google.com/permissions and connect again.',
      }, 400)
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = profileRes.ok ? await profileRes.json() : {}

    const listRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    )
    const list = await listRes.json()
    if (!listRes.ok) {
      return json({ error: list.error?.message || 'Could not list calendars' }, 400)
    }

    const { error: upsertError } = await admin
      .from('google_calendar_connections')
      .upsert({
        user_id: user.id,
        google_email: profile.email ?? null,
        refresh_token: tokens.refresh_token,
        last_sync_error: null,
      }, { onConflict: 'user_id' })
    if (upsertError) return json({ error: upsertError.message }, 400)

    return json({
      ok: true,
      googleEmail: profile.email ?? null,
      calendars: (list.items ?? []).map((c: Record<string, unknown>) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary ?? false,
      })),
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
