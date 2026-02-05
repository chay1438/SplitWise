-- FIX: RLS Recursion on group_members
-- The previous policy caused issues when fetching "My Groups" because checking membership required reading values that were blocked by the check itself.

-- 1. Drop existing problematic policy
drop policy if exists "View members" on public.group_members;

-- 2. Allow users to see their own membership rows unconditionally
-- This allows: select * from group_members where user_id = auth.uid()
create policy "View own memberships" on public.group_members for select using (
  user_id = auth.uid()
);

-- 3. Allow users to see OTHER members in groups they belong to
-- This allows: select * from group_members where group_id = '...' (if I am in it)
create policy "View team members" on public.group_members for select using (
  is_member_of(group_id)
);
