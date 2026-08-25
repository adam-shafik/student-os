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

// A deleted import is tombstoned by its Google id rather than its row id: the
// row id is regenerated on re-import, so only the Google id survives a delete
// followed by a sync.
const tombstone = (googleEventId: string) => `google:${googleEventId}`

// Sheffield's timetable feed puts the module in `summary`, the room in
// `location`, and a structured block in `description` whose LAST line is the
// session type ("Lecture", "Surgery/Drop in", sometimes "Lecture; Lecture").
// Module codes appear as COM226.A.283962; COM318.A.297481.
const TYPE_KEYWORDS: [RegExp, string][] = [
  [/\bexam\b/i,                        'exam'],
  [/\b(?:lab|practical)\b/i,           'lab'],
  [/\b(?:tutorial|surgery|drop.?in)\b/i, 'tutorial'],
  [/\bseminar\b/i,                     'seminar'],
  [/\bworkshop\b/i,                    'workshop'],
  [/\b(?:lecture|lec)\b/i,             'lecture'],
]

function inferType(label: string): string {
  for (const [re, type] of TYPE_KEYWORDS) if (re.test(label)) return type
  return 'other'
}

export const titleKey = (title: string) => title.trim().toLowerCase()

// "Lecture; Lecture" -> "Lecture"; "Lecture; Lab" -> "Lecture / Lab"
function sessionLabel(description?: string): string | null {
  const lines = (description ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const last = lines[lines.length - 1]
  if (!last) return null
  const parts = [...new Set(last.split(';').map(p => p.trim()).filter(Boolean))]
  return parts.length ? parts.join(' / ') : null
}

function moduleCodes(description?: string): string[] {
  return [...(description ?? '').matchAll(/\b([A-Za-z]{2,4}\d{3,4})\.[A-Za-z]\.\d+/g)]
    .map(m => m[1].toUpperCase())
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

interface DomainRow { id: string; code: string | null; name: string }

function matchDomain(summary: string, codes: string[], domains: DomainRow[]): string | null {
  // The codes embedded in the description are the most reliable signal.
  for (const code of codes) {
    const hit = domains.find(d => d.code && titleKey(d.code) === titleKey(code))
    if (hit) return hit.id
  }
  const key = titleKey(summary)
  const exact = domains.find(d =>
    titleKey(d.name || '') === key || (d.code && titleKey(d.code) === key))
  if (exact) return exact.id

  const byCode = domains
    .filter(d => d.code)
    .find(d => new RegExp(`\\b${escapeRe(d.code!)}\\b`, 'i').test(summary))
  if (byCode) return byCode.id
  const byName = domains.find(d => d.name && key.includes(titleKey(d.name)))
  return byName ? byName.id : null
}

// Google returns instants with an offset; the calendar stores wall-clock dates
// and times. Resolve both in the viewer's zone so a 9am lecture stays 9am.
function inZone(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso)).reduce((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:00`,
  }
}

interface GEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

async function fetchCalendarEvents(
  calendarId: string, accessToken: string, timeMin: string, timeMax: string,
): Promise<GEvent[]> {
  const events: GEvent[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('singleEvents', 'true')   // expand recurrences into dated occurrences
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '2500')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error?.message || `Calendar ${calendarId} fetch failed`)

    events.push(...(body.items ?? []))
    pageToken = body.nextPageToken
  } while (pageToken)

  return events
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  let userId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userError } = await caller.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401)
    userId = userData.user.id

    const { timeZone = 'UTC' } = await req.json().catch(() => ({}))

    const { data: conn } = await admin
      .from('google_calendar_connections')
      .select('refresh_token, calendar_ids')
      .eq('user_id', userId)
      .maybeSingle()

    if (!conn) return json({ error: 'No Google Calendar connected' }, 400)
    if (!conn.calendar_ids?.length) return json({ error: 'No calendars selected to sync' }, 400)

    // ── Access token ──────────────────────────────────────────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: conn.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokenRes.ok) {
      throw new Error(
        tokens.error === 'invalid_grant'
          ? 'Google access was revoked or expired. Reconnect your uni calendar.'
          : tokens.error_description || 'Could not refresh Google access',
      )
    }
    const accessToken = tokens.access_token as string

    // ── Window ────────────────────────────────────────────────────────────────
    const { data: term } = await admin
      .from('terms').select('start_date, end_date')
      .eq('user_id', userId).eq('is_current', true).maybeSingle()

    const now = new Date()
    const bounds = [
      new Date(now.getFullYear(), now.getMonth() - 3, 1),
      new Date(now.getFullYear(), now.getMonth() + 12, 1),
    ]
    if (term?.start_date) bounds.push(new Date(term.start_date))
    if (term?.end_date)   bounds.push(new Date(term.end_date))

    const timeMin = new Date(Math.min(...bounds.map(d => d.getTime()))).toISOString()
    const timeMax = new Date(Math.max(...bounds.map(d => d.getTime()))).toISOString()

    const [{ data: domains }, { data: cancelled }, { data: existingRows }, { data: mappingRows }] = await Promise.all([
      admin.from('domains').select('id, code, name').eq('user_id', userId),
      admin.from('cancelled_schedule_events').select('event_id').eq('user_id', userId),
      admin.from('custom_calendar_events')
        .select('id, google_event_id, locally_edited, title, google_summary, date, start_time, duration_minutes, location, description, type, domain_id')
        .eq('user_id', userId)
        .not('google_event_id', 'is', null),
      admin.from('google_event_mappings').select('title_key, domain_id, event_type').eq('user_id', userId),
    ])

    const tombstoned = new Set((cancelled ?? []).map(r => r.event_id))
    const existing = new Map((existingRows ?? []).map(r => [r.google_event_id as string, r]))
    const mappings = new Map((mappingRows ?? []).map(m => [m.title_key as string, m]))

    // ── Pull ──────────────────────────────────────────────────────────────────
    const incoming: GEvent[] = []
    for (const calendarId of conn.calendar_ids) {
      incoming.push(...await fetchCalendarEvents(calendarId, accessToken, timeMin, timeMax))
    }

    let inserted = 0, updated = 0, removed = 0, skippedEdited = 0, unmatched = 0
    const seen = new Set<string>()
    const toInsert: Record<string, unknown>[] = []

    for (const ev of incoming) {
      if (ev.status === 'cancelled' || !ev.start) continue
      if (tombstoned.has(tombstone(ev.id))) continue

      const summary = (ev.summary ?? 'Untitled').trim()
      const label = sessionLabel(ev.description)
      const allDay = !ev.start.dateTime
      const startIso = ev.start.dateTime ?? `${ev.start.date}T00:00:00Z`
      const { date, time } = inZone(startIso, timeZone)

      let durationMinutes: number | null = null
      if (!allDay && ev.end?.dateTime) {
        durationMinutes = Math.round(
          (new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime!).getTime()) / 60000,
        )
      }

      // An explicit mapping is the user's own decision, so it outranks any guess.
      const mapping = mappings.get(titleKey(summary))
      const domainId = mapping
        ? mapping.domain_id
        : matchDomain(summary, moduleCodes(ev.description), domains ?? [])
      if (!domainId) unmatched++

      // Title stays the module name; the session type is carried by `type`.
      const fields = {
        title: summary,
        google_summary: summary,
        date,
        start_time: allDay ? null : time,
        duration_minutes: durationMinutes,
        location: ev.location ?? null,
        description: ev.description?.trim() || null,
        type: inferType(label || summary),
        domain_id: domainId,
      }

      seen.add(ev.id)
      const row = existing.get(ev.id)

      if (!row) {
        toInsert.push({
          ...fields,
          user_id: userId,
          google_event_id: ev.id,
          google_calendar_id: conn.calendar_ids[0],
          reminder_days: [],
        })
        inserted++
        continue
      }

      if (row.locally_edited) { skippedEdited++; continue }

      const changed = (Object.keys(fields) as (keyof typeof fields)[])
        .some(k => String(row[k as keyof typeof row] ?? '') !== String(fields[k] ?? ''))
      if (changed) {
        await admin.from('custom_calendar_events').update(fields).eq('id', row.id)
        updated++
      }
    }

    if (toInsert.length) {
      const { error } = await admin.from('custom_calendar_events').insert(toInsert)
      if (error) throw new Error(`Insert failed: ${error.message}`)
    }

    // Vanished from Google = the class was cancelled upstream. Hand-edited rows
    // are kept: the user's version is theirs to remove.
    const stale = (existingRows ?? [])
      .filter(r => !seen.has(r.google_event_id as string) && !r.locally_edited && !tombstoned.has(tombstone(r.google_event_id as string)))
      .map(r => r.id)
    if (stale.length) {
      await admin.from('custom_calendar_events').delete().in('id', stale)
      removed = stale.length
    }

    await admin.from('google_calendar_connections')
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq('user_id', userId)

    return json({ ok: true, inserted, updated, removed, skippedEdited, unmatched })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    if (userId) {
      await admin.from('google_calendar_connections')
        .update({ last_sync_error: message }).eq('user_id', userId)
    }
    return json({ error: message }, 400)
  }
})
