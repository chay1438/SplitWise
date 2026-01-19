# 📝 Complete Sign Up Flow - Step by Step

This document explains exactly what happens when a user signs up in your SplitWise app, from clicking "Create Account" to being able to use the app.

---

## 🎯 Quick Answer

**After signup, the user is taken to the Email Verification screen.** They must verify their email before they can log in.

---

## 📱 Complete Sign Up Flow

### **Step 1: User Fills Out Sign Up Form**
**Screen:** `SignUpScreen.tsx`

User enters:
- Full Name (e.g., "John Doe")
- Email (e.g., "john@example.com")
- Password
- Confirm Password

**Validations:**
- ✅ All fields must be filled
- ✅ Email must be valid format
- ✅ Passwords must match

---

### **Step 2: User Clicks "Create Account"**
**Function:** `handleSignUp()`

```typescript
await signUp({ email, password, name }).unwrap();
```

This calls the Redux RTK Query mutation `useSignUpMutation`.

---

### **Step 3: Backend - Supabase Auth Sign Up**
**Service:** `authService.signUp()`

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name: fullName }  // Stored in user metadata
  }
});
```

**What Supabase Does:**
1. ✅ Creates a user in `auth.users` table
2. ✅ Sets `email_confirmed_at` to `NULL` (not verified yet)
3. ✅ Stores the name in `raw_user_meta_data` as JSON
4. 📧 **Sends verification email** to the user's email address

---

### **Step 4: Database Trigger Fires** 🔥
**Trigger:** `on_auth_user_created`

As soon as Supabase creates the user in `auth.users`, this trigger automatically runs:

```sql
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW 
EXECUTE PROCEDURE public.handle_new_user();
```

**What the Trigger Does:**
```sql
INSERT INTO public.profiles (id, email, full_name)
VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
```

**Result:** ✅ A profile is automatically created in the `profiles` table with:
- `id`: Same UUID as auth.users.id
- `email`: john@example.com
- `full_name`: John Doe
- `created_at`: Current timestamp

---

### **Step 5: User Navigated to Verify Email Screen**
**Screen:** `VerifyEmailScreen.tsx`

After successful signup, the code navigates:
```typescript
navigation.navigate('VerifyEmail', { email })
```

**What the User Sees:**
- 📧 Mail icon
- "Check your email" heading
- Message: "We have sent a verification link to **john@example.com**"
- Buttons:
  - **"Open Email App"** - Opens device's email client
  - **"Resend Email"** - Sends another verification email
  - **"Back to Login"** - Goes to login screen

---

### **Step 6: User Checks Their Email** 📬

The verification email from Supabase contains:
- **Subject:** "Confirm Your Email"
- **Body:** Link to verify the email
- **Link format:** `https://your-project.supabase.co/auth/v1/verify?token=...`

**Important:** The email might be in spam/junk folder!

---

### **Step 7A: User Clicks Verification Link** ✅

When user clicks the link in their email:

1. **Supabase Updates Database:**
   - Sets `email_confirmed_at` in `auth.users` to current timestamp
   - User is now verified ✅

2. **Redirect Behavior:**
   - If you configured a redirect URL, user is redirected there
   - Otherwise, shows "Email verified" page in browser

---

### **Step 7B: User Can Now Log In** 🎉

User goes back to the app and:
1. Clicks "Back to Login" on the VerifyEmail screen
2. Enters their email and password on Login screen
3. Supabase checks:
   - ✅ Email exists
   - ✅ Password matches
   - ✅ Email is verified (email_confirmed_at is not null)
4. **Success!** User is logged in and sees the App (HomeScreen, Groups, etc.)

---

## 🗄️ Database State After Signup

### **`auth.users` table (Supabase internal)**
```
id: 550e8400-e29b-41d4-a716-446655440000
email: john@example.com
encrypted_password: [hashed password]
email_confirmed_at: NULL  ← Will be set when user verifies
raw_user_meta_data: {"name": "John Doe"}
created_at: 2026-01-05 11:23:00
```

### **`public.profiles` table (Your app)**
```
id: 550e8400-e29b-41d4-a716-446655440000  ← Same as auth.users.id
email: john@example.com
full_name: John Doe
avatar_url: NULL
created_at: 2026-01-05 11:23:00
updated_at: NULL
```

---

## 🔄 Alternative Flow - Email NOT Verified

### **What happens if user tries to login WITHOUT verifying?**

**Depends on your Supabase settings:**

**If "Confirm Email" is REQUIRED (recommended):**
```typescript
// Login attempt
const { error } = await supabase.auth.signInWithPassword({ email, password });

// Error returned:
{
  message: "Email not confirmed",
  status: 400
}
```
❌ User cannot log in until they verify

**If "Confirm Email" is OPTIONAL:**
✅ User can log in even without verification (not recommended for production)

---

## ⚙️ Supabase Configuration

To check/change email verification settings:

1. **Go to Supabase Dashboard**
2. **Authentication** → **Settings**
3. **Email Auth** section:
   - ✅ "Enable email confirmations" - Should be ON
   - "Confirm email" - Set to "Required" or "Optional"
4. **Email Templates:**
   - Customize the verification email content here

---

## 🐛 Common Issues & Solutions

### **Issue 1: User never receives verification email**
**Causes:**
- Email in spam/junk folder
- Incorrect email address entered
- Supabase email service issue (rare)

**Solution:**
- Check spam folder
- Click "Resend Email" button
- Try a different email provider (some block automated emails)

---

### **Issue 2: User already exists**
**What happens:**
```typescript
// Signup attempt with existing email
Error: "User already registered"
```

**Handled in code:**
```typescript
if (lowMsg.includes('already') || lowMsg.includes('registered')) {
  setErrorMessage('This email is already registered. Please log in instead.');
}
```

**Solution:** User should use "Sign In" instead

---

### **Issue 3: Verification link expired**
**What happens:**
- Verification links typically expire after 24 hours
- User clicks old link → "Invalid or expired token"

**Solution:**
- Go back to signup screen
- Enter same credentials
- Click "Resend Email" on VerifyEmail screen

---

## 📊 Complete User Journey Map

```
┌─────────────────┐
│  SignUpScreen   │
│  User enters    │
│  credentials    │
└────────┬────────┘
         │ Clicks "Create Account"
         ▼
┌─────────────────┐
│  Validation     │
│  Check fields   │
│  Check email    │
│  Check password │
└────────┬────────┘
         │ Valid ✅
         ▼
┌─────────────────┐
│  Redux RTK      │
│  signUp()       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  authService    │
│  Supabase       │
│  Auth SignUp    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  auth.users     │  ─── Trigger ───► ┌─────────────────┐
│  created        │                   │ profiles table  │
└────────┬────────┘                   │ created         │
         │                            └─────────────────┘
         │ Email sent 📧
         ▼
┌─────────────────┐
│ VerifyEmail     │
│ Screen          │
│ "Check email"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User's Email   │
│  Inbox          │
│  📧 Verify link │
└────────┬────────┘
         │ Clicks link
         ▼
┌─────────────────┐
│  Supabase       │
│  Verifies       │
│  email_conf...  │
└────────┬────────┘
         │ ✅ Verified
         ▼
┌─────────────────┐
│  LoginScreen    │
│  User logs in   │
└────────┬────────┘
         │ Success!
         ▼
┌─────────────────┐
│   AppStack      │
│   HomeScreen    │
│   (Logged In)   │
└─────────────────┘
```

---

## 🎬 Summary

**After the user signs up:**
1. ✅ User account created in Supabase Auth
2. ✅ Profile automatically created in database (via trigger)
3. 📧 Verification email sent
4. 📱 User taken to "Verify Email" screen
5. ⏳ **User must verify email before logging in**
6. ✅ After verification, user can log in and use the app

**Current State:** Users are **NOT automatically logged in** after signup - they must verify their email first. This is the recommended secure flow! 🔒
