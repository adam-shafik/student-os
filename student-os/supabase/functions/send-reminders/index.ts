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

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const dates = { 0: dateStr(0), 1: dateStr(1), 3: dateStr(3) }

  const { data: assessments } = await supabase
    .from('domain_assessments')
    .select('user_id, title, type, date')
    .in('date', Object.values(dates))

  if (!assessments?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  const byUser: Record<string, typeof assessments> = {}
  for (const a of assessments) {
    if (!byUser[a.user_id]) byUser[a.user_id] = []
    byUser[a.user_id].push(a)
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription, reminder_days')
    .in('user_id', Object.keys(byUser))

  let sent = 0
  for (const sub of subs ?? []) {
    const reminderDays: number[] = sub.reminder_days ?? [1]
    const allItems = byUser[sub.user_id] ?? []

    // Only include items whose offset matches what the user enabled
    const items = allItems.filter(a =>
      Object.entries(dates).some(([offset, date]) =>
        a.date === date && reminderDays.includes(Number(offset))
      )
    )
    if (!items.length) continue

    const offsetLabel = (date: string) => {
      if (date === dates[0]) return 'today'
      if (date === dates[1]) return 'tomorrow'
      return 'in 3 days'
    }

    const title = items.length === 1
      ? `Due ${offsetLabel(items[0].date)}: ${items[0].title}`
      : `${items.length} assessments coming up`
    const body = items.length === 1
      ? `${items[0].type === 'exam' ? 'Exam' : 'Assignment'} due ${offsetLabel(items[0].date)}`
      : items.map(a => `${a.title} (${offsetLabel(a.date)})`).join(', ')

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
