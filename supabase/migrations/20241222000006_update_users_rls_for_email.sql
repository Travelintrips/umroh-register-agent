-- Update RLS policy to allow SELECT based on email
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id OR email = auth.jwt()->>'email');
