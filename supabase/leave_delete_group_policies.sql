-- ==============================================================================
-- MIGRATION: Enable Leave Group and Delete Group
-- ==============================================================================

-- 1. Allow users to "LEAVE" a group (Delete their own membership)
-- This policy allows a user to delete a row from group_members IF that row belongs to them.
DROP POLICY IF EXISTS "Leave group" ON public.group_members;
CREATE POLICY "Leave group" 
ON public.group_members 
FOR DELETE 
USING (user_id = auth.uid());

-- 2. Allow Admins to "DELETE" a group
-- This policy allows a user to delete a row from groups IF they are the creator.
DROP POLICY IF EXISTS "Delete group if owner" ON public.groups;
CREATE POLICY "Delete group if owner" 
ON public.groups 
FOR DELETE 
USING (created_by = auth.uid());

-- NOTE:
-- Because group_members has "ON DELETE CASCADE", deleting the group will automatically
-- remove all members.
-- Because expenses has "ON DELETE SET NULL", expenses will be orphaned (kept but group_id=null).
-- If you WANT expenses to be deleted when group is deleted, you'd need to change FK or manually delete.
