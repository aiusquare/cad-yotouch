-- Enable realtime for verification_requests table
ALTER TABLE public.verification_requests REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_requests;