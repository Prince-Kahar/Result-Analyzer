import { supabase } from '../config/supabase.js';

export async function getEffectiveSessionId(req) {
  const sessId = req.query.session_id || req.headers['x-session-id'];
  if (sessId && sessId !== 'undefined' && sessId !== 'null' && sessId !== '') {
    return sessId;
  }
  // When no session_id is explicitly requested, return null so empty state is cleanly preserved
  return null;
}
