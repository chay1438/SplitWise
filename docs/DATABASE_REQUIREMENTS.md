# 📊 Complete Database Requirements - What You Need

## ✅ **What You ALREADY Have:**

Your current `schema.sql` already includes these tables:

### **Core Tables (Already Created):**

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | User accounts | ✅ **Already exists** |
| `groups` | Expense groups | ✅ **Already exists** |
| `group_members` | Group memberships | ✅ **Already exists** |
| `friendships` | Friend connections | ✅ **Already exists** |
| `expenses` | Expense records | ✅ **Already exists** |
| `expense_splits` | How expenses are split | ✅ **Already exists** |
| `settlements` | Payments between users | ✅ **Already exists** |
| `activities` | Activity feed | ✅ **Already exists** |
| `notifications` | User notifications | ✅ **Already exists** |

**Your schema is 90% complete!** ✅

---

## ⚠️ **What You NEED TO ADD:**

Only **2 small changes** needed:

### **1. Add `phone_number` Column to `profiles`**

**Why:** For contact matching (find friends by phone number)

```sql
-- Add phone_number column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone 
ON public.profiles(phone_number);
```

**Impact:** Enables friend discovery from device contacts ✅

---

### **2. (Optional) Create `invitations` Table**

**Why:** Track friend invitations (who invited whom)

**Status:** **OPTIONAL** - Not required for MVP, but nice to have!

```sql
-- Optional: Track invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id uuid REFERENCES public.profiles(id) NOT NULL,
  method text CHECK (method IN ('sms', 'email', 'share')),
  recipient_info text,  -- Phone or email (for tracking only)
  referral_code text UNIQUE,
  status text CHECK (status IN ('sent', 'accepted', 'expired')) DEFAULT 'sent',
  accepted_user_id uuid REFERENCES public.profiles(id),  -- Set when they sign up
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at timestamp with time zone
);

-- Index for finding invitations
CREATE INDEX IF NOT EXISTS idx_invitations_inviter 
ON public.invitations(inviter_id);

CREATE INDEX IF NOT EXISTS idx_invitations_referral 
ON public.invitations(referral_code);
```

**Benefits:**
- Track who invited whom
- Reward users for inviting friends
- Analytics on invitation effectiveness
- See pending invitations

**You can skip this for now!** Start with just the `phone_number` column.

---

## 📋 **Complete SQL Script to Run:**

**Copy this entire script and run in Supabase SQL Editor:**

```sql
-- ================================================================================
-- DATABASE UPDATES FOR FRIEND FEATURES
-- Run this in Supabase SQL Editor
-- ================================================================================

-- ============================================================================
-- 1. ADD PHONE NUMBER TO PROFILES (REQUIRED)
-- ============================================================================

-- Add phone_number column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Create index for fast phone number lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone 
ON public.profiles(phone_number);

-- Update RLS policy to allow phone number search
-- (Needed for contact matching)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

CREATE POLICY "Public profiles viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);  -- Any authenticated user can search profiles


-- ============================================================================
-- 2. INVITATIONS TABLE (OPTIONAL - CAN SKIP FOR NOW)
-- ============================================================================

-- Uncomment this section if you want to track invitations

/*
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id uuid REFERENCES public.profiles(id) NOT NULL,
  method text CHECK (method IN ('sms', 'email', 'share')),
  recipient_info text,
  referral_code text UNIQUE,
  status text CHECK (status IN ('sent', 'accepted', 'expired')) DEFAULT 'sent',
  accepted_user_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_invitations_inviter 
ON public.invitations(inviter_id);

CREATE INDEX IF NOT EXISTS idx_invitations_referral 
ON public.invitations(referral_code);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own invitations
CREATE POLICY "View own invitations" 
ON public.invitations 
FOR SELECT 
USING (auth.uid() = inviter_id OR auth.uid() = accepted_user_id);

-- Policy: Users can create invitations
CREATE POLICY "Create invitations" 
ON public.invitations 
FOR INSERT 
WITH CHECK (auth.uid() = inviter_id);
*/


-- ============================================================================
-- 3. VERIFICATION QUERY
-- ============================================================================

-- Check if phone_number column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'phone_number';

-- Should show:
-- column_name   | data_type
-- phone_number  | text
```

---

## 🎯 **Why These Changes?**

### **Why Add `phone_number`?**

**Without phone_number:**
```
Contact: Bob (555-123-4567)
Database: Can't search by phone ❌
Result: Bob not found
```

**With phone_number:**
```
Contact: Bob (555-123-4567)
Database: Searches profiles.phone_number ✅
Result: Bob found! (if registered)
```

**Enables:**
- ✅ Contact-based friend discovery
- ✅ "Find friends from contacts" feature
- ✅ Better match rate (phone + email)

---

### **Why Add `invitations` Table? (Optional)**

**Without invitations table:**
- ✅ Still works! (Users can share invite links)
- ❌ Can't track who invited whom
- ❌ Can't reward users for inviting friends
- ❌ Can't see analytics

**With invitations table:**
- ✅ Track every invitation sent
- ✅ Know when invitations were accepted
- ✅ Reward top inviters (gamification)
- ✅ Analytics dashboard
- ✅ See "Pending invitations" list

**Recommendation:** Skip for now, add later if needed!

---

## 📊 **Final Database Structure:**

```
┌─────────────────────────────────────────┐
│  USERS & AUTHENTICATION                 │
├─────────────────────────────────────────┤
│  profiles                               │
│  ├─ id (uuid)                           │
│  ├─ email (text)                        │
│  ├─ full_name (text)                    │
│  ├─ phone_number (text) ← NEW!         │
│  └─ avatar_url (text)                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  SOCIAL FEATURES                         │
├─────────────────────────────────────────┤
│  friendships                            │
│  ├─ user_id1 (uuid)                     │
│  ├─ user_id2 (uuid)                     │
│  └─ status (pending/accepted)           │
│                                          │
│  invitations (optional)                 │
│  ├─ inviter_id (uuid)                   │
│  ├─ referral_code (text)                │
│  └─ status (sent/accepted)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  GROUPS & EXPENSES                       │
├─────────────────────────────────────────┤
│  groups                                 │
│  group_members                          │
│  expenses                               │
│  expense_splits                         │
│  settlements                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ACTIVITY & NOTIFICATIONS                │
├─────────────────────────────────────────┤
│  activities                             │
│  notifications                          │
└─────────────────────────────────────────┘
```

---

## ✅ **What You Need to Do RIGHT NOW:**

### **Step 1: Run SQL Script (2 minutes)**

1. Open **Supabase Dashboard** → **SQL Editor**
2. **Copy** the SQL script above (the one with phone_number)
3. **Paste** and click **"Run"**
4. ✅ **Done!** `phone_number` column added

### **Step 2: Update SignUp to Capture Phone (Later)**

When users sign up, ask for phone number:

```typescript
// In SignUpScreen.tsx
const [phoneNumber, setPhoneNumber] = useState('');

const handleSignUp = async () => {
  // Create account
  const { data } = await signUp({ email, password, name });
  
  // Save phone number
  if (phoneNumber) {
    await supabase
      .from('profiles')
      .update({ phone_number: phoneNumber })
      .eq('id', data.user.id);
  }
};
```

But you can also skip this! Phone can be populated from contacts during friend discovery.

---

## 🎯 **Summary:**

**What you have:**
- ✅ profiles
- ✅ groups, group_members
- ✅ friendships
- ✅ expenses, expense_splits
- ✅ settlements
- ✅ activities, notifications

**What you need to add:**
1. ✅ **`phone_number` column** to `profiles` ← **Do this NOW!**
2. ⏳ **`invitations` table** ← **Optional, skip for MVP**

**That's it!** Just add one column and you're ready! 🎉

---

## 📝 **Action Items:**

| Task | Priority | Time | Status |
|------|---------|------|--------|
| Add `phone_number` to profiles | 🔴 **HIGH** | 2 min | ⏳ **DO NOW** |
| Run the SQL script | 🔴 **HIGH** | 1 min | ⏳ **DO NOW** |
| Create invitations table | 🟡 Low | 5 min | ⏸️ **Skip for now** |

---

**Copy the SQL script above and run it in Supabase!** Takes 2 minutes! 🚀
