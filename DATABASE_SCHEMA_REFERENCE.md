# 📊 SplitWise Database Schema Reference

This document provides a complete overview of all tables, columns, relationships, RLS policies, and triggers used in the SplitWise application.

---

## 📋 Table of Contents
1. [Tables Overview](#tables-overview)
2. [Table Details](#table-details)
3. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
4. [Storage Policies](#storage-policies)
5. [Triggers & Automation](#triggers--automation)
6. [Helper Functions & Views](#helper-functions--views)
7. [Common Issues & Fixes](#common-issues--fixes)

---

## Tables Overview

| # | Table Name | Purpose | RLS Enabled |
|---|------------|---------|-------------|
| 1 | `profiles` | User profile information | ✅ Yes |
| 2 | `groups` | Expense sharing groups | ✅ Yes |
| 3 | `group_members` | Group membership records | ✅ Yes |
| 4 | `friendships` | Friend connections between users | ✅ Yes |
| 5 | `expenses` | Individual expenses | ✅ Yes |
| 6 | `expense_splits` | How expenses are split among users | ✅ Yes |
| 7 | `settlements` | Payment records between users | ✅ Yes |
| 8 | `activities` | Activity feed/history | ❌ No |
| 9 | `notifications` | User notifications | ❌ No |

---

## Table Details

### 1. **PROFILES** (`public.profiles`)
Stores user profile information linked to Supabase Auth.

**Columns:**
```sql
id              uuid            PRIMARY KEY (references auth.users)
email           text            User's email address
full_name       text            Display name
avatar_url      text            Profile picture URL
created_at      timestamptz     Account creation timestamp
updated_at      timestamptz     Last profile update
```

**Relationships:**
- `id` references `auth.users.id` (1:1)
- Referenced by: groups, expenses, friendships, etc.

**Indexes:** Primary key on `id`

---

### 2. **GROUPS** (`public.groups`)
Expense sharing groups (e.g., "Roommates", "Bali Trip").

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
name            text            Group name (NOT NULL)
type            text            'Home', 'Trip', 'Couple', 'Other' (default: 'Other')
created_by      uuid            Creator's user ID (references profiles.id)
created_at      timestamptz     Creation timestamp
updated_at      timestamptz     Last update timestamp
```

**Relationships:**
- `created_by` → `profiles.id`
- Has many: group_members, expenses

**Indexes:** 
- Primary key on `id`

---

### 3. **GROUP_MEMBERS** (`public.group_members`)
Junction table linking users to groups.

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
group_id        uuid            Group reference (ON DELETE CASCADE)
user_id         uuid            User reference
joined_at       timestamptz     When user joined
UNIQUE(group_id, user_id)       Prevents duplicate memberships
```

**Relationships:**
- `group_id` → `groups.id` (CASCADE delete)
- `user_id` → `profiles.id`

**Indexes:**
- `idx_group_members_group_id` on `group_id`
- `idx_group_members_user_id` on `user_id`

---

### 4. **FRIENDSHIPS** (`public.friendships`)
Friend connections between users.

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
user_id1        uuid            First user (must be < user_id2)
user_id2        uuid            Second user
status          text            'pending', 'accepted', 'blocked' (default: 'pending')
created_at      timestamptz     Request/connection timestamp
CHECK(user_id1 < user_id2)      Prevents duplicates like (A,B) and (B,A)
UNIQUE(user_id1, user_id2)      Ensures one friendship record per pair
```

**Relationships:**
- `user_id1`, `user_id2` → `profiles.id`

**Indexes:**
- `idx_friendships_user_id1` on `user_id1`
- `idx_friendships_user_id2` on `user_id2`

---

### 5. **EXPENSES** (`public.expenses`)
Individual expense records.

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
group_id        uuid            Optional group reference (ON DELETE SET NULL)
payer_id        uuid            Who paid (references profiles.id)
description     text            Expense description (NOT NULL)
amount          numeric(10,2)   Amount (must be > 0)
currency        text            Currency code (default: 'USD')
date            timestamptz     Expense date
category        text            Category (e.g., 'Food', 'Transport')
created_by      uuid            Who created the expense
created_at      timestamptz     Creation timestamp
updated_at      timestamptz     Last update timestamp
```

**Relationships:**
- `group_id` → `groups.id` (SET NULL on delete)
- `payer_id` → `profiles.id`
- `created_by` → `profiles.id`
- Has many: expense_splits

**Indexes:**
- `idx_expenses_group_id` on `group_id`
- `idx_expenses_payer_id` on `payer_id`

---

### 6. **EXPENSE_SPLITS** (`public.expense_splits`)
How each expense is divided among participants.

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
expense_id      uuid            Expense reference (ON DELETE CASCADE)
user_id         uuid            Who owes this portion
amount          numeric(10,2)   Amount owed (>= 0)
UNIQUE(expense_id, user_id)     One split per user per expense
```

**Relationships:**
- `expense_id` → `expenses.id` (CASCADE delete)
- `user_id` → `profiles.id`

**Indexes:**
- `idx_expense_splits_expense_id` on `expense_id`
- `idx_expense_splits_user_id` on `user_id`

---

### 7. **SETTLEMENTS** (`public.settlements`)
Payment records (when someone pays back their debt).

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
payer_id        uuid            Who made the payment
payee_id        uuid            Who received the payment
group_id        uuid            Optional group context (ON DELETE SET NULL)
amount          numeric(10,2)   Payment amount (> 0)
currency        text            Currency (default: 'USD')
date            timestamptz     Payment date
created_at      timestamptz     Record creation timestamp
```

**Relationships:**
- `payer_id` → `profiles.id`
- `payee_id` → `profiles.id`
- `group_id` → `groups.id` (SET NULL on delete)

---

### 8. **ACTIVITIES** (`public.activities`)
Activity feed for user actions.

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
user_id         uuid            User performing the action
group_id        uuid            Optional group context
action          text            Action type (e.g., 'created_expense', 'joined_group')
target_id       uuid            Reference to related entity (loose)
details         jsonb           Additional data (flexible JSON)
created_at      timestamptz     Action timestamp
```

**Relationships:**
- `user_id` → `profiles.id`
- `group_id` → `groups.id` (optional)

---

### 9. **NOTIFICATIONS** (`public.notifications`)
User notification system.

**Columns:**
```sql
id              uuid            PRIMARY KEY (auto-generated)
user_id         uuid            Notification recipient
title           text            Notification title
message         text            Notification content
is_read         boolean         Read status (default: false)
created_at      timestamptz     Notification timestamp
```

**Relationships:**
- `user_id` → `profiles.id`

---

## Row Level Security (RLS) Policies

RLS is enabled on: `profiles`, `groups`, `group_members`, `friendships`, `expenses`, `expense_splits`, `settlements`

### **PROFILES**
```sql
✅ SELECT: "Public profiles are viewable by everyone."
   - Anyone can view profiles (useful for friend search)

✅ INSERT: "Users can insert their own profile."
   - Users can only create their own profile (auth.uid() = id)

✅ UPDATE: "Users can update own profile."
   - Users can only update their own profile
```

### **GROUPS**
```sql
✅ SELECT: "View groups if member"
   - Users can only see groups they're a member of
   - Uses: EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())

✅ INSERT: "Create groups"
   - Users can create groups (auth.uid() = created_by)

✅ UPDATE: "Update groups if member"
   - Only group members can update group details
```

### **GROUP_MEMBERS**
```sql
✅ SELECT: "View members"
   - Users can view members of groups they belong to
   - Uses helper function: is_member_of(group_id)

✅ INSERT: "Join group"
   - Currently: WITH CHECK (true) - allows anyone to join
   - ⚠️ Consider adding invitation logic for production
```

### **EXPENSES**
```sql
✅ SELECT: "View expenses if in group"
   - Users can see expenses from their groups OR expenses they created
   - Logic: (group_id IS NOT NULL AND user is member) OR (payer_id = auth.uid())

✅ INSERT: "Create expenses"
   - Users can create expenses (auth.uid() = created_by)
```

### **EXPENSE_SPLITS**
```sql
✅ SELECT: "View splits"
   - Users can see splits for expenses in their groups or expenses they paid for

✅ INSERT: "Create splits"
   - Only the expense creator can add splits
   - Uses: EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid())
```

### **SETTLEMENTS**
```sql
✅ RLS Enabled but no policies shown in schema.sql
   - ⚠️ You may need to add policies for production
```

---

## Storage Policies

### **Receipts Bucket** (`storage.receipts`)

```sql
-- Bucket Configuration
- Bucket ID: 'receipts'
- Public: true (URLs are publicly accessible)

-- Policies:
✅ SELECT: "Receipts are publicly accessible"
   - Anyone can view/download receipts

✅ INSERT: "Authenticated users can upload receipts"
   - Any authenticated user can upload
   - Condition: bucket_id = 'receipts' AND auth.role() = 'authenticated'

✅ UPDATE: "Users can update their own receipts"
   - Users can only update files they own

✅ DELETE: "Users can delete their own receipts"
   - Users can only delete files they own
```

---

## Triggers & Automation

### 1. **Auto Profile Creation**
```sql
TRIGGER: on_auth_user_created
WHEN: AFTER INSERT on auth.users
DOES: Creates a profile in public.profiles with email and name from metadata
```

### 2. **Updated_at Timestamp**
```sql
TRIGGERS: on_profiles_updated, on_groups_updated, on_expenses_updated
WHEN: BEFORE UPDATE
DOES: Automatically sets updated_at = now()
```

### 3. **New Expense Activity**
```sql
TRIGGER: on_expense_created
WHEN: AFTER INSERT on expenses
DOES: 
  - Logs activity for all group members (if group expense)
  - Logs activity for creator only (if personal expense)
  - Stores expense details in JSONB
```

### 4. **New Group Member**
```sql
TRIGGER: on_member_added
WHEN: AFTER INSERT on group_members
DOES:
  - Sends notification to new member
  - Logs "joined_group" activity
```

### 5. **Settlement Created**
```sql
TRIGGER: on_settlement_created
WHEN: AFTER INSERT on settlements
DOES:
  - Notifies payee about payment received
  - Logs activity for both payer and payee
```

---

## Helper Functions & Views

### **Function: `is_member_of(_group_id uuid)`**
```sql
PURPOSE: Check if current user is a member of a group
RETURNS: boolean
SECURITY: DEFINER (bypasses RLS to avoid recursion)
USAGE: Used in RLS policies to prevent infinite recursion
```

### **Function: `get_user_total_balance(query_user_id uuid)`**
```sql
PURPOSE: Calculate total net balance across all groups for a user
RETURNS: numeric
LOGIC: Sums net_balance from group_balances_view
```

### **View: `group_balances_view`**
```sql
PURPOSE: Calculate net balance for each user in each group
COLUMNS:
  - group_id: uuid
  - user_id: uuid
  - net_balance: numeric

LOGIC:
  net_balance = (amount paid in expenses + settlements paid)
                - (amount owed in splits + settlements received)

USES 4 CTEs:
  1. expense_credits: What users paid for expenses
  2. expense_debits: What users owe from expense splits
  3. settlement_credits: Settlement payments made
  4. settlement_debits: Settlement payments received
```

---

## Common Issues & Fixes

### ⚠️ Issue 1: "new row violates row-level security policy for table 'groups'"
**Cause:** Group creator is not automatically added to group_members
**Fix:** After creating a group, immediately insert creator into group_members:
```sql
INSERT INTO group_members (group_id, user_id) 
VALUES (new_group_id, auth.uid());
```

**Workflow to fix:** Run `/fix_group_rls`

---

### ⚠️ Issue 2: "infinite recursion detected in policy for relation 'group_members'"
**Cause:** RLS policy on group_members queries itself
**Fix:** Use the helper function `is_member_of()` which has SECURITY DEFINER
**Already implemented in schema.sql ✅**

**Workflow to fix:** Run `/fix_rls_recursion`

---

### ⚠️ Issue 3: Missing 'role' column in groups table
**Cause:** Old schema versions had a 'role' column in group_members
**Fix:** The current schema doesn't use this column - ensure you're using the latest schema.sql

**Workflow to fix:** Run `/fix_schema_role`

---

### ⚠️ Issue 4: Cannot find native module 'ExponentImagePicker'
**Cause:** Native app doesn't have expo-image-picker compiled
**Fix:** Rebuild the app with `npx expo run:android`

---

## Files Location

All SQL files are located in `c:\projects\SplitWise\supabase\`:
- `schema.sql` - Main database schema (tables, RLS, indexes)
- `storage_policies.sql` - Storage bucket configuration
- `triggers.sql` - Automation triggers and functions

---

## Quick Commands

**To reset entire database:**
```sql
-- Run schema.sql (it has DROP TABLE statements at the top)
```

**To check RLS is working:**
```sql
-- Try querying as a specific user
SET request.jwt.claims.sub = '<user_uuid>';
SELECT * FROM groups;
```

**To add a new policy:**
```sql
CREATE POLICY "policy_name" ON table_name
FOR operation -- SELECT, INSERT, UPDATE, DELETE
USING (condition);  -- For SELECT, UPDATE, DELETE
-- OR
WITH CHECK (condition);  -- For INSERT, UPDATE
```

---

## Summary

- **9 Tables** in total
- **7 Tables** have RLS enabled
- **5 Automated Triggers**
- **2 Helper Functions**
- **1 Materialized View** for balance calculations
- **1 Storage Bucket** for receipts with 4 policies

This schema ensures secure multi-user expense tracking with automatic activity logging and notifications!
