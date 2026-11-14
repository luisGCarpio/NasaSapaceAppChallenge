-- ============================================================================
-- A.R.E.S. Pulse — Supabase PostgreSQL Schema & Strict RLS Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  crew_role TEXT NOT NULL DEFAULT 'Astronauta — Tripulación A.R.E.S.',
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  last_streak_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  client_submission_id TEXT,
  sleep_hours NUMERIC(4, 2) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 14),
  mood TEXT NOT NULL CHECK (mood IN ('excelente', 'bien', 'cansado', 'estresado', 'agotado')),
  heart_rate INTEGER NOT NULL CHECK (heart_rate >= 40 AND heart_rate <= 180),
  bp_systolic INTEGER NOT NULL CHECK (bp_systolic >= 70 AND bp_systolic <= 200),
  bp_diastolic INTEGER NOT NULL CHECK (bp_diastolic >= 40 AND bp_diastolic <= 130),
  glucose INTEGER NOT NULL CHECK (glucose >= 50 AND glucose <= 250),
  temperature NUMERIC(4, 2) NOT NULL CHECK (temperature >= 34.5 AND temperature <= 41.0),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('GREEN', 'YELLOW', 'RED')),
  readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
  cross_conclusion_id TEXT NOT NULL,
  algorithm_version TEXT NOT NULL DEFAULT '2.0.0',
  updates_count INTEGER NOT NULL DEFAULT 1,
  evaluation_json JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT checkins_bp_coherence CHECK (bp_diastolic <= bp_systolic - 10),
  CONSTRAINT checkins_user_date_unique UNIQUE (user_id, date_key),
  CONSTRAINT checkins_client_sub_unique UNIQUE (user_id, client_submission_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_recorded
  ON public.checkins(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  date_key DATE NOT NULL,
  xp_awarded INTEGER NOT NULL CHECK (xp_awarded >= 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mission_unique_daily UNIQUE (user_id, mission_id, date_key)
);

CREATE TABLE IF NOT EXISTS public.comms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_status TEXT NOT NULL CHECK (overall_status IN ('GREEN', 'YELLOW', 'RED', 'INSUFFICIENT_DATA')),
  readiness_score INTEGER,
  message_text TEXT NOT NULL,
  copied_to_clipboard BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seguridad estricta por usuario autenticado (Zero Trust, sin acceso anónimo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.checkins, public.mission_completions, public.comms_logs FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT SELECT, INSERT ON public.mission_completions TO authenticated;
GRANT SELECT, INSERT ON public.comms_logs TO authenticated;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY checkins_own_rows ON public.checkins
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY mission_completions_own_rows ON public.mission_completions
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY comms_logs_own_rows ON public.comms_logs
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
