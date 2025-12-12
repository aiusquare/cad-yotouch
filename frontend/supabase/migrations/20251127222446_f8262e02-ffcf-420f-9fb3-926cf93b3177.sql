-- Update RLS policies to allow validators to update verification requests
DROP POLICY IF EXISTS "Validators can view all verification requests" ON public.verification_requests;

CREATE POLICY "Validators can view all verification requests"
ON public.verification_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'primary_validator'::app_role) OR 
  has_role(auth.uid(), 'secondary_validator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Validators can update verification requests"
ON public.verification_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'primary_validator'::app_role) OR 
  has_role(auth.uid(), 'secondary_validator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow validators to view and update profiles for verification purposes
CREATE POLICY "Validators can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'primary_validator'::app_role) OR 
  has_role(auth.uid(), 'secondary_validator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Validators can update profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'primary_validator'::app_role) OR 
  has_role(auth.uid(), 'secondary_validator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);