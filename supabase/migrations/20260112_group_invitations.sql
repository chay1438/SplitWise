-- 1. Create table for storing group invitations
CREATE TABLE IF NOT EXISTS public.group_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token text UNIQUE NOT NULL, -- The secret code (e.g., "abc-123")
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone DEFAULT timezone('utc'::text, now() + interval '7 days') NOT NULL,
    used_count integer DEFAULT 0,
    max_uses integer DEFAULT NULL, -- NULL means unlimited uses (until expiry)
    is_active boolean DEFAULT true
);

-- 2. Enable RLS
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy: Members of a group can SEE invitations for that group
CREATE POLICY "Group members can view invitations" ON public.group_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = group_invitations.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- Policy: Members of a group can CREATE invitations for that group
CREATE POLICY "Group members can create invitations" ON public.group_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = group_invitations.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- Policy: Only creator (or maybe admins) can DELETE invitations
CREATE POLICY "Creators can cancel invitations" ON public.group_invitations
    FOR DELETE
    USING (
        created_by = auth.uid()
    );


-- 4. RPC Function to Securely Join a Group via Token
-- This function runs with "SECURITY DEFINER" meaning it bypasses RLS to perform the join
-- ONLY if the token is valid. This is the key security mechanism.

CREATE OR REPLACE FUNCTION public.join_group_via_token(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner (bypassing RLS for the insert)
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_group_id uuid;
    v_user_id uuid;
    v_invite_record record;
    v_existing_member integer;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- Find the invitation
    SELECT * INTO v_invite_record
    FROM public.group_invitations
    WHERE token = invite_token
      AND is_active = true
      AND expires_at > now();

    IF v_invite_record IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
    END IF;

    v_group_id := v_invite_record.group_id;

    -- Check if already a member
    SELECT 1 INTO v_existing_member
    FROM public.group_members
    WHERE group_id = v_group_id AND user_id = v_user_id;

    IF v_existing_member IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Already a member of this group', 'group_id', v_group_id);
    END IF;

    -- Add user to group
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_group_id, v_user_id, 'MEMBER');

    -- Increment usage count
    UPDATE public.group_invitations
    SET used_count = used_count + 1
    WHERE id = v_invite_record.id;

    -- (Optional) If max_uses reached, deactivate it
    IF v_invite_record.max_uses IS NOT NULL AND (v_invite_record.used_count + 1) >= v_invite_record.max_uses THEN
        UPDATE public.group_invitations SET is_active = false WHERE id = v_invite_record.id;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Successfully joined group', 'group_id', v_group_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
