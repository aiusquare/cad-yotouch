-- Allow users to update their own verification request records during onboarding
CREATE POLICY "Users can update their own verification requests"
ON public.verification_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
