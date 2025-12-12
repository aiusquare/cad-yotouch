-- Extend app_role enum with field_agent to support admin workflows
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'field_agent';

-- Table to store additional metadata about field agents
CREATE TABLE IF NOT EXISTS public.field_agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  coverage_area TEXT,
  tier TEXT CHECK (tier IN ('community', 'regional', 'national')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  max_primary_validators INTEGER NOT NULL DEFAULT 15 CHECK (max_primary_validators >= 0),
  last_assignment_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.field_agent_profiles ENABLE ROW LEVEL SECURITY;

-- Allow agents to manage their own profile entries
CREATE POLICY "Field agents can view their profile"
ON public.field_agent_profiles
FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Field agents can update their profile"
ON public.field_agent_profiles
FOR UPDATE
USING (auth.uid() = agent_id)
WITH CHECK (auth.uid() = agent_id);

-- Admin override policies
CREATE POLICY "Admins manage field agents"
ON public.field_agent_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Store the onboarding pipeline that field agents collect for prospective primary validators
CREATE TABLE IF NOT EXISTS public.primary_validator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  candidate_contact TEXT,
  candidate_email TEXT,
  community TEXT,
  region TEXT,
  nin TEXT,
  bvn TEXT,
  supporting_documents JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'kyc_pending'
    CHECK (status IN ('kyc_pending', 'screening', 'awaiting_admin', 'approved', 'rejected', 'needs_info')),
  field_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  primary_validator_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.primary_validator_applications ENABLE ROW LEVEL SECURITY;

-- Field agents can see and insert the applications they own
CREATE POLICY "Field agents manage their applications"
ON public.primary_validator_applications
FOR ALL
USING (field_agent_id = auth.uid())
WITH CHECK (field_agent_id = auth.uid());

-- Admin override for onboarding pipeline
CREATE POLICY "Admins manage validator applications"
ON public.primary_validator_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Reuse timestamp trigger helper for the new tables
CREATE TRIGGER update_field_agent_profiles_updated_at
BEFORE UPDATE ON public.field_agent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_primary_validator_applications_updated_at
BEFORE UPDATE ON public.primary_validator_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
