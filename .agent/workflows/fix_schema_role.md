---
description: Fix Missing Role Column
---

# Fix Database Schema

You are seeing "Could not find the 'role' column" because your `group_members` table is missing the `role` column which the app uses to distinguish admins from members.

**Run this SQL in Supabase SQL Editor:**

```sql
alter table public.group_members 
add column if not exists role text default 'member';
```
