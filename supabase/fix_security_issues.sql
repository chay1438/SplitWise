-- ================================================================
-- Fix Supabase Security Issues
-- Run this in your Supabase SQL Editor
-- ================================================================

-- 1. Enable RLS on activities and notifications tables
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS Policies for ACTIVITIES
-- Users can only see activities for themselves
CREATE POLICY "Users can view own activities" 
ON public.activities 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow inserting activities (for triggers/system)
CREATE POLICY "System can insert activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (true);

-- 3. Add RLS Policies for NOTIFICATIONS
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow inserting notifications (for triggers/system)
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- 4. Fix group_balances_view Security Definer issue
-- Recreate the view as SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.group_balances_view;

CREATE VIEW public.group_balances_view 
WITH (security_invoker = true) AS
WITH expense_credits AS (
    SELECT group_id, payer_id AS user_id, sum(amount) AS amount_paid
    FROM expenses
    WHERE group_id IS NOT NULL
    GROUP BY group_id, payer_id
),
expense_debits AS (
    SELECT e.group_id, s.user_id, sum(s.amount) AS amount_owed
    FROM expense_splits s
    JOIN expenses e ON s.expense_id = e.id
    WHERE e.group_id IS NOT NULL
    GROUP BY e.group_id, s.user_id
),
settlement_credits AS (
    SELECT group_id, payer_id AS user_id, sum(amount) AS amount_paid
    FROM settlements
    WHERE group_id IS NOT NULL
    GROUP BY group_id, payer_id
),
settlement_debits AS (
    SELECT group_id, payee_id AS user_id, sum(amount) AS amount_received
    FROM settlements
    WHERE group_id IS NOT NULL
    GROUP BY group_id, payee_id
)
SELECT 
    COALESCE(ec.group_id, ed.group_id) AS group_id,
    COALESCE(ec.user_id, ed.user_id) AS user_id,
    (
        COALESCE(ec.amount_paid, 0) + COALESCE(sc.amount_paid, 0)
    ) - (
        COALESCE(ed.amount_owed, 0) + COALESCE(sd.amount_received, 0)
    ) AS net_balance
FROM expense_credits ec
FULL OUTER JOIN expense_debits ed ON ec.group_id = ed.group_id AND ec.user_id = ed.user_id
FULL OUTER JOIN settlement_credits sc ON (ec.group_id = sc.group_id OR ed.group_id = sc.group_id) AND (ec.user_id = sc.user_id OR ed.user_id = sc.user_id)
FULL OUTER JOIN settlement_debits sd ON (ec.group_id = sd.group_id OR ed.group_id = sd.group_id) AND (ec.user_id = sd.user_id OR ed.user_id = sd.user_id);

-- 5. Fix Function Search Path issues
-- Update all functions to use explicit schema references

-- Fix get_user_total_balance
CREATE OR REPLACE FUNCTION public.get_user_total_balance(query_user_id uuid)
RETURNS numeric 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    total_bal numeric;
BEGIN
    SELECT sum(net_balance) INTO total_bal
    FROM public.group_balances_view
    WHERE user_id = query_user_id;
    
    RETURN COALESCE(total_bal, 0);
END;
$$;

-- Fix is_member_of function
CREATE OR REPLACE FUNCTION public.is_member_of(_group_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
    AND user_id = auth.uid()
  );
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at() 
RETURNS trigger
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- 6. Enable Leaked Password Protection (in Supabase Dashboard)
-- This must be done in the Supabase Dashboard:
-- Go to Authentication > Settings > Password Protection
-- Enable "Leaked password protection"

-- ================================================================
-- Verification Queries
-- ================================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('activities', 'notifications');

-- Should show rowsecurity = true for both

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('activities', 'notifications');

-- Should show at least 2 policies for each table
