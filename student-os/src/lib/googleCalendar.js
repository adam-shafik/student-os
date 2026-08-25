import { supabase } from './supabase'
// Re-exported so callers have one import; the capture itself must live in a
// module that never reaches supabase.js. See googleAuthCode.js.
export { takePendingGoogleCode } from './googleAuthCode'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export const googleCalendarConfigured = Boolean(CLIENT_ID)

export const googleRedirectUri = () => `${window.location.origin}/`

export function startGoogleCalendarConnect() {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', googleRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')   // without this Google withholds the refresh token on re-consent
  url.searchParams.set('state', `gcal:${crypto.randomUUID()}`)
  sessionStorage.setItem('sos-gcal-connecting', '1')   // lets the app notice a consent that came back empty
  window.location.href = url.toString()
}

async function callConnect(body) {
  return unwrap(await supabase.functions.invoke('google-calendar-connect', { body }))
}

// On a non-2xx, supabase-js throws away the response body and reports only
// "Edge Function returned a non-2xx status code". The real message is on
// error.context, which is the raw Response.
async function unwrap({ data, error }) {
  if (data?.error) return { error: data.error }
  if (!error) return data
  try {
    const body = await error.context?.json?.()
    if (body?.error) return { error: body.error }
  } catch {
    // body wasn't JSON — fall through to the generic message
  }
  return { error: error.message }
}

export const exchangeGoogleCode = (code) =>
  callConnect({ action: 'exchange', code, redirectUri: googleRedirectUri() })

export const selectGoogleCalendars = (calendarIds) =>
  callConnect({ action: 'select-calendars', calendarIds })

export const disconnectGoogleCalendar = () => callConnect({ action: 'disconnect' })

export async function syncGoogleCalendar() {
  return unwrap(await supabase.functions.invoke('google-calendar-sync', {
    body: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  }))
}
