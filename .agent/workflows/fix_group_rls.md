---
description: Fix Group Creation RLS Error
---

# Fix Group Creation Policy

You are seeing "new row violates row-level security policy" because when you create a group, the database immediately checks if you can "see" it. The old rule only allowed "members" to see groups, but you aren't a member *yet* (that happens milliseconds later).

**Run this SQL in Supabase SQL Editor to fix it:**

```sql
-- Drop the restrictive policy
drop policy if exists "View groups if member" on public.groups;

-- Create a new policy that allows Creates AND Members to see groups
create policy "View groups if member or creator" on public.groups for select using (
  (created_by = auth.uid()) OR
  (exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid()))
);
```
