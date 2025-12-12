-- Add missing fields used by the validator dashboards
ALTER TABLE public.verification_requests
ADD COLUMN IF NOT EXISTS residential_claim TEXT,
ADD COLUMN IF NOT EXISTS address_match_score INTEGER CHECK (address_match_score >= 0 AND address_match_score <= 100),
ADD COLUMN IF NOT EXISTS character_level TEXT,
ADD COLUMN IF NOT EXISTS address_rating TEXT;

-- Expand the status workflow to include validator stages
ALTER TABLE public.verification_requests
DROP CONSTRAINT IF EXISTS verification_requests_status_check;

ALTER TABLE public.verification_requests
ADD CONSTRAINT verification_requests_status_check
CHECK (
  status IN (
    'pending',
    'primary_validated',
    'verified',
    'rejected'
  )
);
