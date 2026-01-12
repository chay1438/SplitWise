---
description: Fix RLS Infinite Recursion
---

# Fix Recursive Policy Error

You are encountering an "infinite recursion" error because the RLS policy for `group_members` tries to query itself.
To fix this, you must run the following SQL command in your **Supabase Dashboard -> SQL Editor**.

Copy and paste this entire block and run it:

```sql
-- 1. Create a secure helper function to bypass RLS for membership checks
create or replace function public.is_member_of(_group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members
    where group_id = _group_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the old broken policy
drop policy if exists "View members" on public.group_members;

-- 3. Create the new fixed policy
create policy "View members" on public.group_members for select using (
  is_member_of(group_id)
);
```

After running this, the "Failed to save group" error will be resolved.
