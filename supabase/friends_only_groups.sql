-- ================================================================================
-- FRIENDS-ONLY GROUP MEMBERSHIP POLICIES
-- Created: 2026-01-05
-- Description: Users can only add friends to groups
-- ================================================================================

-- Business Rule:
-- - Users must be friends (accepted friendship) before being added to groups
-- - Prevents strangers from being added to groups
-- - Encourages social connection through friendships

-- ============================================================================
-- 1. GROUP_MEMBERS TABLE - FRIENDS ONLY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "View members" ON public.group_members;
DROP POLICY IF EXISTS "Join group" ON public.group_members;
DROP POLICY IF EXISTS "Members can add others" ON public.group_members;
DROP POLICY IF EXISTS "Add friends to group" ON public.group_members;
DROP POLICY IF EXISTS "Remove members" ON public.group_members;

-- POLICY 1: VIEW - Members can see other members in their groups
CREATE POLICY "View members if member of group" 
ON public.group_members 
FOR SELECT 
USING (
  -- You can see members if you're also in the group
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
  )
);

-- POLICY 2: INSERT - Can only add yourself OR accepted friends to groups
CREATE POLICY "Add yourself or friends to group" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  -- Option 1: You're adding yourself (for group creation or self-join)
  auth.uid() = user_id
  OR
  -- Option 2: You're adding a friend AND you're already in the group
  (
    -- Check: You're already a member of this group
    EXISTS (
      SELECT 1 FROM group_members existing
      WHERE existing.group_id = group_members.group_id
      AND existing.user_id = auth.uid()
    )
    AND
    -- Check: The person being added is your friend (accepted status)
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (
        -- Friendship can be in either direction
        (user_id1 = auth.uid() AND user_id2 = group_members.user_id)
        OR
        (user_id2 = auth.uid() AND user_id1 = group_members.user_id)
      )
      AND status = 'accepted'  -- Must be accepted friendship
    )
  )
);

-- POLICY 3: DELETE - Members can remove others (or themselves)
CREATE POLICY "Members can remove from group" 
ON public.group_members 
FOR DELETE 
USING (
  -- Option 1: You're removing yourself
  user_id = auth.uid()
  OR
  -- Option 2: You're a member of the group (can remove others)
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
  )
);


-- ============================================================================
-- 2. FRIENDSHIPS TABLE - Complete Management
-- ============================================================================

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "View friendships" ON public.friendships;
DROP POLICY IF EXISTS "Create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Delete friendships" ON public.friendships;

-- POLICY 1: VIEW - See your own friendships (sent or received)
CREATE POLICY "View your friendships" 
ON public.friendships 
FOR SELECT 
USING (
  user_id1 = auth.uid() 
  OR 
  user_id2 = auth.uid()
);

-- POLICY 2: INSERT - Send friend requests
CREATE POLICY "Send friend requests" 
ON public.friendships 
FOR INSERT 
WITH CHECK (
  -- You're the sender (user_id1)
  auth.uid() = user_id1
  AND
  -- Initial status must be 'pending'
  status = 'pending'
  AND
  -- Can't friend yourself
  user_id1 != user_id2
);

-- POLICY 3: UPDATE - Accept or reject friend requests sent to you
CREATE POLICY "Accept or reject friend requests" 
ON public.friendships 
FOR UPDATE 
USING (
  -- You're the recipient (user_id2)
  auth.uid() = user_id2
)
WITH CHECK (
  -- You're the recipient
  auth.uid() = user_id2
  AND
  -- Can only update to 'accepted' or 'blocked'
  status IN ('accepted', 'blocked')
);

-- POLICY 4: DELETE - Remove friendships (unfriend)
CREATE POLICY "Remove friendships" 
ON public.friendships 
FOR DELETE 
USING (
  -- Either person in the friendship can delete it
  user_id1 = auth.uid() 
  OR 
  user_id2 = auth.uid()
);


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check group_members policies
SELECT 
  'group_members' as table_name,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'group_members'
ORDER BY policyname;

-- Check friendships policies
SELECT 
  'friendships' as table_name,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'friendships'
ORDER BY policyname;


-- ============================================================================
-- TEST SCENARIOS
-- ============================================================================

-- Scenario 1: Bob and Alice are friends (accepted)
-- Expected: ✅ Bob can add Alice to his group

-- Scenario 2: Bob and Charlie are not friends
-- Expected: ❌ Bob CANNOT add Charlie to his group

-- Scenario 3: Bob sends friend request to Alice (pending)
-- Expected: ❌ Bob CANNOT add Alice to group yet (not accepted)

-- Scenario 4: Bob wants to join a group himself
-- Expected: ✅ Bob can add himself (self-join allowed)


-- ============================================================================
-- NOTES
-- ============================================================================

-- Friend Request Flow:
-- 1. Bob sends request: INSERT INTO friendships (user_id1, user_id2, status) 
--    VALUES ('bob-id', 'alice-id', 'pending')
-- 2. Alice sees pending request
-- 3. Alice accepts: UPDATE friendships SET status = 'accepted' 
--    WHERE id = request_id AND user_id2 = 'alice-id'
-- 4. Now they're friends!
-- 5. Bob can now add Alice to groups: INSERT INTO group_members...

-- Important:
-- - Friendships are bidirectional (either user_id1 or user_id2)
-- - Status must be 'accepted' before adding to groups
-- - Users can always add themselves to groups (self-join)
