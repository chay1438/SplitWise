# 🔒 Supabase Security Issues - Explained & Fixed

## 📋 Overview

Supabase has detected **9 security issues** in your database. This document explains what each one means and how to fix them.

---

## 🔴 CRITICAL Issues (Must Fix Immediately)

### **1. RLS Disabled in `public.activities`** ⚠️

**What it means:**
Row Level Security (RLS) is not enabled on the `activities` table. This means **any authenticated user can read ALL activities** from all users.

**Security Risk:** HIGH
- User A can see User B's activities
- No privacy protection

**Fix:**
```sql
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" 
ON public.activities FOR SELECT 
USING (user_id = auth.uid());
```

---

### **2. RLS Disabled in `public.notifications`** ⚠️

**What it means:**
Row Level Security (RLS) is not enabled on `notifications` table. **Any user can read everyone's notifications**.

**Security Risk:** HIGH
- Privacy breach
- Users can read each other's notifications

**Fix:**
```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());
```

---

### **3. Security Definer View - `public.group_balances_view`** ⚠️

**What it means:**
Your `group_balances_view` is created with `SECURITY DEFINER`, which means it runs with **elevated privileges**. This can be exploited if not carefully designed.

**Security Risk:** MEDIUM-HIGH
- Potential for privilege escalation
- Can bypass RLS if not careful

**Fix:**
Recreate the view with `SECURITY INVOKER`:
```sql
DROP VIEW IF EXISTS public.group_balances_view;

CREATE VIEW public.group_balances_view 
WITH (security_invoker = true) AS
-- [view definition here]
```

---

## ⚠️ WARNING Issues (Should Fix)

### **4-8. Function Search Path Mutable** 🟡

**Affected Functions:**
- `public.get_user_total_balance`
- `public.handle_new_expense`
- `public.handle_new_member`
- `public.handle_new_settlement`
- `public.handle_updated_at`
- `public.is_member_of`

**What it means:**
These functions don't explicitly set `search_path`, making them vulnerable to **search path attacks**. An attacker could create a malicious function in another schema that gets called instead.

**Security Risk:** MEDIUM
- Potential code injection
- Function hijacking

**Fix:**
Add `SET search_path = public, pg_temp` to each function:
```sql
CREATE OR REPLACE FUNCTION public.get_user_total_balance(query_user_id uuid)
RETURNS numeric 
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← Add this!
LANGUAGE plpgsql
AS $$
-- function body
$$;
```

---

### **9. Leaked Password Protection Disabled** 🟡

**What it means:**
Supabase can check if passwords have been leaked in data breaches (using haveibeenpwned database). This protection is currently **OFF**.

**Security Risk:** LOW-MEDIUM
- Users might use compromised passwords
- Increases account takeover risk

**Fix:**
**In Supabase Dashboard:**
1. Go to **Authentication** → **Settings**
2. Scroll to **Password Protection**
3. Toggle **ON** "Leaked password protection"

This **cannot** be fixed via SQL - must use the dashboard!

---

## 🛠️ How to Fix Everything

### **Option 1: Run the Fix Script (Recommended)**

I've created `fix_security_issues.sql` for you.

**Steps:**
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy contents of `supabase/fix_security_issues.sql`
5. Paste and click **Run**
6. ✅ Done!

---

### **Option 2: Manual Fixes**

Run each section individually in Supabase SQL Editor.

---

## 📊 Before vs After

### **Before (Current State):**
```
❌ Activities table - No RLS (anyone can read)
❌ Notifications table - No RLS (anyone can read)
⚠️  group_balances_view - Security Definer (risky)
⚠️  6 Functions - Mutable search path (exploitable)
⚠️  Auth - No leaked password protection
```

### **After (Fixed):**
```
✅ Activities table - RLS enabled (users see only their data)
✅ Notifications table - RLS enabled (users see only their data)
✅ group_balances_view - Security Invoker (safe)
✅ All Functions - Fixed search path (protected)
⚠️  Auth - Enable in dashboard manually
```

---

## 🔍 Verify Fixes

After running the fix script, verify:

### **1. Check RLS is enabled:**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('activities', 'notifications');
```

**Expected:** Both should show `rowsecurity = true`

---

### **2. Check policies exist:**
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('activities', 'notifications');
```

**Expected:** At least 2 policies for each table

---

### **3. Check function search paths:**
```sql
SELECT 
    routine_name, 
    routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'handle_%';
```

**Expected:** Each function should contain `SET search_path`

---

## 🎯 Impact on Your App

### **After fixing:**

**Activities Table:**
- ✅ Users can only see their own activities
- ✅ System triggers can still insert activities
- ❌ Users cannot delete/modify activities (read-only)

**Notifications Table:**
- ✅ Users can only see their own notifications
- ✅ Users can mark notifications as read (update)
- ✅ System can create notifications

**group_balances_view:**
- ✅ Runs with user permissions (safer)
- ✅ Users can only see balances for groups they're in (via existing RLS on underlying tables)

**Functions:**
- ✅ Protected from search path attacks
- ✅ Same functionality, more secure

---

## ⏱️ Timeline

**Urgency Level:** **HIGH** 🔴

**Why:**
- Activities and Notifications are exposed to all users
- Privacy breach risk
- Data leak potential

**When to fix:** **IMMEDIATELY**

**Time to fix:** ~5 minutes
1. Copy SQL script (1 min)
2. Run in Supabase (2 min)
3. Enable password protection in dashboard (2 min)

---

## 🚨 What Happens If You Don't Fix?

### **Scenario 1: Activities Leak**
```
User A creates expense → Activity logged
User B queries: SELECT * FROM activities;
Result: User B sees User A's activity ❌
```

### **Scenario 2: Notification Leak**
```
User A gets payment notification
User B queries: SELECT * FROM notifications;
Result: User B reads User A's private notifications ❌
```

### **Scenario 3: Current Risk Level**
- **Data Privacy:** VIOLATED ⚠️
- **GDPR Compliance:** FAIL ⚠️
- **Production Readiness:** NOT READY ⚠️

---

## ✅ Post-Fix Checklist

After running the fix script:

- [ ] Run fix script in Supabase SQL Editor
- [ ] Verify RLS is enabled on both tables
- [ ] Verify policies are created
- [ ] Enable leaked password protection in dashboard
- [ ] Test app - ensure activities/notifications still work
- [ ] Check Supabase advisor again - issues should be gone
- [ ] Document this for production deployment

---

## 📱 Testing After Fix

### **Test 1: Activities are private**
1. User A logs in → creates expense
2. User B logs in → queries activities
3. **Expected:** User B sees only their own activities ✅

### **Test 2: Notifications are private**
1. User A gets notification
2. User B queries notifications table
3. **Expected:** User B sees only their own notifications ✅

---

## 🎓 Understanding RLS (Row Level Security)

**What is RLS?**
RLS controls which rows a user can see/modify in a table based on policies.

**Example:**
```sql
-- Policy: Users can only see their own data
CREATE POLICY "View own data" 
ON notifications 
FOR SELECT 
USING (user_id = auth.uid());
```

**How it works:**
```
User makes query: SELECT * FROM notifications;

PostgreSQL adds WHERE clause automatically:
SELECT * FROM notifications WHERE user_id = auth.uid();

User only sees their own rows! ✅
```

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Search Path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [OWASP Database Security](https://owasp.org/www-project-database-security/)

---

## ❓ FAQ

**Q: Will this break my app?**
A: No! The app will work the same, but more securely. Activities and notifications will still be created by triggers.

**Q: Why weren't these enabled from the start?**
A: The original `schema.sql` didn't include RLS for these tables. Common oversight in initial development.

**Q: Can I test before production?**
A: Yes! Run the fix in your dev/staging environment first.

**Q: How long does the fix take?**
A: ~5 minutes total.

---

**Status:** ⚠️ **ACTION REQUIRED** - Run `fix_security_issues.sql` NOW!
