-- FIX: Group Creation Error
-- Problem: When creating a group, we return the group data immediately (.select()).
-- The 'View groups' policy required the user to be in 'group_members', but we haven't inserted them there yet!
-- Fix: Update policy to allow the 'created_by' user to SEE the group immediately.

drop policy if exists "View groups if member" on public.groups;

create policy "View groups if member or creator" on public.groups for select using (
  (created_by = auth.uid()) 
  OR
  exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid())
);
