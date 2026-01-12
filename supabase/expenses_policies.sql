-- ================================================================================
-- EXPENSES & EXPENSE_SPLITS RLS POLICIES
-- Created: 2026-01-05
-- Description: Row Level Security policies for expenses and expense_splits tables
-- ================================================================================

-- Purpose:
-- 1. Ensure only group members can see group expenses
-- 2. Ensure only the payer can create/edit/delete expenses
-- 3. Ensure only the payer can create/edit/delete splits
-- 4. Ensure all group members can see all splits

-- ============================================================================
-- 1. EXPENSES TABLE POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent - safe to run multiple times)
DROP POLICY IF EXISTS "View expenses if in group" ON public.expenses;
DROP POLICY IF EXISTS "Create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Delete own expenses" ON public.expenses;

-- POLICY 1: VIEW (SELECT)
-- All group members can see expenses in their groups
-- OR users can see expenses they paid for
CREATE POLICY "View expenses if in group" 
ON public.expenses 
FOR SELECT 
USING (
  -- Can see if you're in the group
  (group_id IS NOT NULL 
   AND EXISTS (
     SELECT 1 FROM public.group_members 
     WHERE group_id = expenses.group_id 
     AND user_id = auth.uid()
   ))
  OR
  -- Or if you're the payer (for personal expenses)
  (payer_id = auth.uid())
);

-- POLICY 2: CREATE (INSERT)
-- Anyone can create expenses, but only as themselves as the payer
CREATE POLICY "Create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (auth.uid() = payer_id);

-- POLICY 3: UPDATE
-- Only the payer can edit their own expense
CREATE POLICY "Update own expenses" 
ON public.expenses 
FOR UPDATE 
USING (auth.uid() = payer_id)
WITH CHECK (auth.uid() = payer_id);

-- POLICY 4: DELETE
-- Only the payer can delete their own expense
CREATE POLICY "Delete own expenses" 
ON public.expenses 
FOR DELETE 
USING (auth.uid() = payer_id);


-- ============================================================================
-- 2. EXPENSE_SPLITS TABLE POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent - safe to run multiple times)
DROP POLICY IF EXISTS "View splits if can see expense" ON public.expense_splits;
DROP POLICY IF EXISTS "Create splits by payer only" ON public.expense_splits;
DROP POLICY IF EXISTS "Update splits by payer only" ON public.expense_splits;
DROP POLICY IF EXISTS "Delete splits by payer only" ON public.expense_splits;

-- POLICY 1: VIEW (SELECT)
-- Group members can see splits for expenses they can access
CREATE POLICY "View splits if can see expense" 
ON public.expense_splits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    LEFT JOIN public.group_members gm 
      ON e.group_id = gm.group_id
    WHERE e.id = expense_splits.expense_id 
    AND (
      gm.user_id = auth.uid()  -- You're in the group
      OR e.payer_id = auth.uid()  -- Or you're the payer
    )
  )
);

-- POLICY 2: CREATE (INSERT)
-- Only the payer of the expense can create splits
CREATE POLICY "Create splits by payer only" 
ON public.expense_splits 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_id 
    AND payer_id = auth.uid()
  )
);

-- POLICY 3: UPDATE
-- Only the payer of the expense can edit splits
CREATE POLICY "Update splits by payer only" 
ON public.expense_splits 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_id 
    AND payer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_id 
    AND payer_id = auth.uid()
  )
);

-- POLICY 4: DELETE
-- Only the payer of the expense can delete splits
CREATE POLICY "Delete splits by payer only" 
ON public.expense_splits 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_id 
    AND payer_id = auth.uid()
  )
);


-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to confirm policies are in place
-- ============================================================================

-- Check expenses policies
SELECT 
  'expenses' as table_name,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'expenses'
ORDER BY policyname;

-- Check expense_splits policies
SELECT 
  'expense_splits' as table_name,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'expense_splits'
ORDER BY policyname;


-- ============================================================================
-- NOTES
-- ============================================================================

-- Business Rules:
-- 1. Expenses: All group members can VIEW group expenses
-- 2. Expenses: Anyone can CREATE an expense (as themselves as payer)
-- 3. Expenses: Only the PAYER can UPDATE/DELETE their expense
-- 4. Splits: All group members can VIEW splits
-- 5. Splits: Only the PAYER can CREATE/UPDATE/DELETE splits

-- Security:
-- - RLS ensures users can only see data they're allowed to see
-- - Policies are enforced at the database level (can't be bypassed)
-- - Even if frontend code is compromised, database is protected

-- How Policies Work:
-- - USING clause: Controls which rows are visible for SELECT, UPDATE, DELETE
-- - WITH CHECK clause: Controls which rows can be inserted/updated
-- - Multiple policies combine with OR logic (if any policy allows, operation succeeds)
