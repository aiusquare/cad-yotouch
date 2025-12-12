-- Add audit + review fields for validator handoff
ALTER TABLE public.verification_requests
ADD COLUMN IF NOT EXISTS primary_validator_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS primary_validator_notes TEXT,
ADD COLUMN IF NOT EXISTS primary_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS secondary_validator_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS secondary_validator_notes TEXT,
ADD COLUMN IF NOT EXISTS secondary_validated_at TIMESTAMPTZ;
