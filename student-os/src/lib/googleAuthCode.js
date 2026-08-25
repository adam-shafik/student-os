// Deliberately has NO imports.
//
// Google returns its consent code as ?code=, which is exactly what the Supabase
// client's detectSessionInUrl watches for. Supabase strips the parameter while
// trying to claim it as its own login callback, so whichever runs first wins.
// ES imports evaluate before the importing module's body, so any module that
// imports the Supabase client cannot win that race — this file must stay
// dependency-free and be imported before anything that reaches supabase.js.
let pendingCode = null

const params = new URLSearchParams(window.location.search)
if (params.get('code') && params.get('state')?.startsWith('gcal:')) {
  pendingCode = params.get('code')
  window.history.replaceState({}, '', window.location.pathname)
}

export function takePendingGoogleCode() {
  const code = pendingCode
  pendingCode = null
  return code
}
