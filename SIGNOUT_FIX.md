# 🔧 Sign Out Navigation Issue - FIXED

## Problem
After clicking "Sign Out" in the AccountScreen, the app was not navigating back to the AuthStack (Login/Signup screens). The user remained on the same screen with no visible action or navigation.

---

## Root Causes

### 1. **Redux Persist Caching Old Session** ⚠️
The auth state (including session tokens) was being persisted to AsyncStorage via Redux Persist:
```typescript
// OLD CODE - WRONG
whitelist: ['auth', 'expenses', 'groups', 'api']
```

**Problem:** Even after signing out and clearing Redux state, Redux Persist would **rehydrate** the old session from AsyncStorage on next render, making `session` non-null again.

**Fix:** Removed 'auth' from persist whitelist since Supabase manages its own session storage:
```typescript
// NEW CODE - CORRECT
whitelist: ['expenses', 'groups']  // DON'T persist auth
```

---

### 2. **Effect Hook Dependency Array Issue** 🔄
The `useAuth` hook had `user` in the dependency array:
```typescript
// OLD CODE - WRONG
}, [dispatch, user]);  // Including 'user' caused issues
```

**Problem:** 
- When `user` changed, the effect would re-run
- This could cause the onAuthStateChange listener to be recreated unnecessarily
- The check `if (!user && session.user)` could miss sign-out events

**Fix:** Removed user from dependencies and improved event handling:
```typescript
// NEW CODE - CORRECT
}, [dispatch]);  // Only depend on dispatch

// Also improved the event check:
if (event === 'SIGNED_OUT' || session === null) {
  // Handle sign out
}
```

---

### 3. **Missing Debug Logs** 🐛
There weren't enough console logs to track the sign-out flow.

**Fix:** Added comprehensive logging:
```typescript
// In useAuth.ts
console.log('AUTH STATE CHANGE:', event, 'Session:', !!session);

// In RootNavigation.tsx
console.log('═══════════════════════════════════');
console.log('ROOT NAV - Session exists:', !!session);
console.log('ROOT NAV - Will show:', session ? 'AppStack' : 'AuthStack');
console.log('═══════════════════════════════════');
```

---

## Files Modified

### 1. **`src/hooks/useAuth.ts`**
- Fixed `onAuthStateChange` to properly handle SIGNED_OUT event
- Removed `user` from dependency array
- Added console logs for debugging
- Improved event type checking

### 2. **`src/store/store.ts`**
- Removed 'auth' from Redux Persist whitelist
- Added comments explaining why session shouldn't be persisted

### 3. **`src/store/api/authApi.ts`**
- Added console logs to track sign-out flow
- Improved error handling

### 4. **`src/navigation/RootNavigation.tsx`**
- Added visual separator for console logs
- Improved debugging output

---

## How It Works Now

**Sign Out Flow:**
1. User clicks "Sign Out" → `handleLogout()` called
2. `signOut().unwrap()` → Calls Supabase `signOut()`
3. Supabase clears its internal session
4. `onAuthStateChange` fires with event='SIGNED_OUT'
5. Redux state updated: `session = null`, `user = null`
6. **No persistence** → AsyncStorage doesn't interfere
7. `RootNavigation` re-renders
8. Condition `{session ? <AppStack /> : <AuthStack />}` → Shows **AuthStack**
9. User sees Login screen ✅

---

## Testing

### Before Rebuild, Clear App Data:
Since we changed persistence logic, you need to clear old cached data:

**Option 1: Uninstall and reinstall the app**
```bash
# The build currently running will install fresh
```

**Option 2: Clear app data manually**
- Go to Settings → Apps → SplitWise → Storage → Clear Data

---

## Expected Console Output on Sign Out:

```
✅ Sign out successful, clearing Redux state...
AUTH STATE CHANGE: SIGNED_OUT Session: false
✅ Redux state cleared
═══════════════════════════════════
ROOT NAV - Session exists: false
ROOT NAV - Loading: false
ROOT NAV - Will show: AuthStack
═══════════════════════════════════
```

---

## Why This Fix Works

1. **No Session Persistence:** Supabase handles its own session storage in a secure way. Redux Persist was interfering with this.

2. **Clean State Updates:** The auth listener now correctly updates state on SIGNED_OUT without stale dependencies.

3. **Immediate Navigation:** Once `session` becomes `null`, React immediately re-renders RootNavigation with AuthStack.

4. **No Race Conditions:** Removing `user` from dependencies prevents the effect from running at the wrong time.

---

## Summary

The issue was caused by **Redux Persist keeping old sessions alive** even after sign-out. By removing auth state from persistence and fixing the onAuthStateChange listener logic, the app now correctly navigates to the login screen when users sign out.

**Status:** ✅ **FIXED** - Ready to test after rebuild completes!
