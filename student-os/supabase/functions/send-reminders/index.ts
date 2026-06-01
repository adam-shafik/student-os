import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

function dateStr(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const OFFSETS = [0, 1, 3]
const dates: Record<number, string> = Object.fromEntries(OFFSETS.map(o => [o, dateStr(o)]))

function offsetLabel(offset: number): string {
  if (offset === 0) return 'today'
  if (offset === 1) return 'tomorrow'
  return 'in 3 days'
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // Fetch assessments that have a reminder for one of today's target dates
  // reminder_days stores offsets — e.g. [1] means "remind 1 day before"
  // So an assessment due in 1 day should fire if reminder_days contains 1
  const { data: assessments } = await supabase
    .from('domain_assessments')
    .select('user_id, title, type, date, reminder_days')
    .not('reminder_days', 'eq', '{}')
    .in('date', OFFSETS.map(o => dateStr(o)))

  const { data: customEvents } = await supabase
    .from('custom_calendar_events')
    .select('user_id, title, date, reminder_days')
    .not('reminder_days', 'eq', '{}')
    .in('date', OFFSETS.map(o => dateStr(o)))

  // Build per-user list of items due today after applying their per-item offset filter
  const byUser: Record<string, { title: string; type?: string; offset: number }[]> = {}

  const addItem = (userId: string, item: { title: string; type?: string; offset: number }) => {
    if (!byUser[userId]) byUser[userId] = []
    byUser[userId].push(item)
  }

  for (const a of assessments ?? []) {
    const reminderDays: number[] = a.reminder_days ?? []
    const offset = OFFSETS.find(o => dates[o] === a.date && reminderDays.includes(o))
    if (offset !== undefined) addItem(a.user_id, { title: a.title, type: a.type, offset })
  }

  for (const e of customEvents ?? []) {
    const reminderDays: number[] = (e as any).reminder_days ?? []
    const offset = OFFSETS.find(o => dates[o] === e.date && reminderDays.includes(o))
    if (offset !== undefined) addItem(e.user_id, { title: e.title, offset })
  }

  if (!Object.keys(byUser).length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', Object.keys(byUser))

  let sent = 0
  for (const sub of subs ?? []) {
    const items = byUser[sub.user_id]
    if (!items?.length) continue

    const title = items.length === 1
      ? `${items[0].title} — ${offsetLabel(items[0].offset)}`
      : `${items.length} things coming up`
    const body = items.length === 1
      ? `${items[0].type === 'exam' ? 'Exam' : items[0].type === 'assignment' ? 'Assignment' : 'Event'} due ${offsetLabel(items[0].offset)}`
      : items.map(i => `${i.title} (${offsetLabel(i.offset)})`).join(', ')

    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url: '/' }))
      sent++
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id)
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
