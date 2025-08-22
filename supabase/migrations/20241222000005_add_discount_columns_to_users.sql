-- Add discount columns to users table
ALTER TABLE public.users 
ADD COLUMN handling_discount_kind TEXT CHECK (handling_discount_kind IN ('PERCENT', 'AMOUNT')),
ADD COLUMN handling_discount_value DECIMAL(10,2),
ADD COLUMN handling_discount_cap DECIMAL(10,2),
ADD COLUMN handling_discount_active BOOLEAN DEFAULT false;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own row
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can UPDATE their own row but NOT discount columns
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  handling_discount_kind IS NOT DISTINCT FROM (SELECT handling_discount_kind FROM public.users WHERE id = auth.uid()) AND
  handling_discount_value IS NOT DISTINCT FROM (SELECT handling_discount_value FROM public.users WHERE id = auth.uid()) AND
  handling_discount_cap IS NOT DISTINCT FROM (SELECT handling_discount_cap FROM public.users WHERE id = auth.uid()) AND
  handling_discount_active IS NOT DISTINCT FROM (SELECT handling_discount_active FROM public.users WHERE id = auth.uid())
);

-- Policy: Only admins can UPDATE discount columns
DROP POLICY IF EXISTS "Admins can update discount columns" ON public.users;
CREATE POLICY "Admins can update discount columns"
ON public.users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND account_type = 'admin'
  )
);

-- Policy: Users can INSERT their own row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);