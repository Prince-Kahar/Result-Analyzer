-- ==========================================================
-- SASCMA / VNSGU Result Analyzer - Database Fix Script
-- Grant permissions on import_sessions table
-- Run this in Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Grant table and sequence permissions
GRANT ALL ON TABLE public.import_sessions TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 2. Enable Row Level Security (RLS) with open access policies
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on import_sessions" ON public.import_sessions;
CREATE POLICY "Service role full access on import_sessions" 
  ON public.import_sessions 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access for all" ON public.import_sessions;
CREATE POLICY "Allow read access for all" 
  ON public.import_sessions 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON public.import_sessions;
CREATE POLICY "Allow insert for all" 
  ON public.import_sessions 
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
