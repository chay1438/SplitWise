-- ==============================================================================
-- MIGRATION: Enable Member Management (Promote/Remove)
-- ==============================================================================

-- 1. Allow Admins to UPDATE group_members (e.g. to change role to 'admin')
-- Policy: You can update a member row IF you are an 'admin' of that group.
DROP POLICY IF EXISTS "Admins can update members" ON public.group_members;
CREATE POLICY "Admins can update members" 
ON public.group_members 
FOR UPDATE 
USING (
  exists (
    select 1 from public.group_members as gm
    where gm.group_id = group_members.group_id
    and gm.user_id = auth.uid()
    and gm.role = 'admin'
  )
);

-- 2. Allow Admins to DELETE group_members (Remove people)
-- Policy: You can delete a member row IF you are an 'admin' of that group.
DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;
CREATE POLICY "Admins can remove members" 
ON public.group_members 
FOR DELETE 
USING (
  exists (
    select 1 from public.group_members as gm
    where gm.group_id = group_members.group_id
    and gm.user_id = auth.uid()
    and gm.role = 'admin'
  )
);
