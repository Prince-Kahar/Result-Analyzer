import { supabase } from '../config/supabase.js';

export async function getEffectiveSessionId(req) {
  const sessId = req.query?.session_id || req.headers?.['x-session-id'];
  if (sessId && sessId !== 'undefined' && sessId !== 'null' && sessId !== '') {
    return sessId;
  }
  // Fallback to latest available session in database so public endpoints return active gazette
  try {
    const { data: latest } = await supabase
      .from('students')
      .select('session_id')
      .order('id', { ascending: false })
      .limit(1);

    if (latest && latest.length > 0 && latest[0].session_id) {
      return latest[0].session_id;
    }
  } catch (_) {}

  return null;
}
