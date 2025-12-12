-- Update profiles table to split nin_bvn and add separate name fields
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nin_bvn;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

ALTER TABLE public.profiles ADD COLUMN first_name text;
ALTER TABLE public.profiles ADD COLUMN last_name text;
ALTER TABLE public.profiles ADD COLUMN nin text;
ALTER TABLE public.profiles ADD COLUMN bvn text;

-- Update the handle_new_user function to use new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile with user metadata
  INSERT INTO public.profiles (id, first_name, last_name, nin, bvn, phone_number)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'nin',
    NEW.raw_user_meta_data->>'bvn',
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;