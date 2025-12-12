-- Drop any existing foreign key constraint on user_id
ALTER TABLE public.verification_requests
DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;

-- Add correct foreign key relationship between verification_requests and profiles
ALTER TABLE public.verification_requests
ADD CONSTRAINT verification_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;