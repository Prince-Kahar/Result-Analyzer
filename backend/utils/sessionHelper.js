import { supabase } from '../config/supabase.js';

export async function getEffectiveSessionId(req) {
  if (req.query.session_id) {
    return req.query.session_id;
  }

  // Look up latest imported session in students table
  try {
    const { data: latestRow } = await supabase
      .from('students')
      .select('session_id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRow && latestRow.session_id) {
      return latestRow.session_id;
    }
  } catch (_) {}

  return null;
}
