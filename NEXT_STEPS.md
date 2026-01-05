# 🚀 Next Steps - Implementation Checklist

## ✅ **Completed:**

- ✅ Database updated (`phone_number` column added)
- ✅ `app.json` updated with contacts permissions
- ✅ Services created (`contactService.ts`, `invitationService.ts`)
- ✅ Friend request flow updated (`friendService.ts`, `friendsApi.ts`)

---

## 📦 **Step 1: Install NPM Packages** (5 minutes)

Run these commands in your project terminal:

```bash
# Install contacts
npx expo install expo-contacts

# Install SMS and Email (for invitations)
npx expo install expo-sms
npx expo install expo-mail-composer

# Install type definitions (for Buffer and Platform)
npm install --save-dev @types/node
```

**Restart your terminal after** to ensure modules are loaded.

---

## 🔄 **Step 2: Prebuild (Required for New Permissions)** (5 minutes)

Since you added new permissions, you need to rebuild:

```bash
# Stop current build (Ctrl+C in the terminal where expo run:android is running)

# Clean and rebuild
npx expo prebuild --clean

# Run again
npx expo run:android
```

**Why:** Permissions are native configs that need rebuild.

---

## 🎨 **Step 3: Test Friend Discovery** (Manual Testing)

After rebuild, test the flow:

### **Test 1: Find Friends from Contacts**
1. Open app → Go to Friends screen
2. Click "Find from Contacts"
3. Grant permission when prompted
4. Should see list of friends (if any registered with phone numbers)

### **Test 2: Send Friend Request**
1. From matched friends list
2. Click "Add Friend"
3. Should send pending request

### **Test 3: Invite Unregistered Friend**
1. From unmatched contacts list
2. Click "Invite to Join"
3. Choose share method (WhatsApp, SMS, etc.)
4. Should open share sheet

---

## 🐛 **Step 4: Fix Existing Lint Errors** (Optional but Recommended)

You have a few lint errors to fix:

### **Error 1: FriendsScreen.tsx**
Location: Line 5
```
Module '../../store/api/friendsApi' has no exported member 'useAddFriendMutation'.
```

**Fix:** Change to `useSendFriendRequestMutation`

```typescript
// Old:
import { useGetFriendsQuery, useAddFriendMutation } from '../../store/api/friendsApi';

// New:
import { useGetFriendsQuery, useSendFriendRequestMutation } from '../../store/api/friendsApi';
```

### **Error 2-4: invitationService.ts**
These will be fixed after Step 1 (installing packages).

---

## 📱 **Step 5: Update Signup to Capture Phone** (Optional)

Add phone number field to SignUpScreen:

```typescript
// In SignUpScreen.tsx
const [phoneNumber, setPhoneNumber] = useState('');

// Add input field:
<TextInput
  placeholder="Phone Number (optional)"
  value={phoneNumber}
  onChangeText={setPhoneNumber}
  keyboardType="phone-pad"
/>

// When signing up:
if (phoneNumber) {
  await supabase
    .from('profiles')
    .update({ phone_number: phoneNumber })
    .eq('id', user.id);
}
```

**This is optional** - phone numbers can also be populated from contacts during friend discovery.

---

## 🎯 **Priority Order:**

| Step | Priority | Time | Status |
|------|---------|------|--------|
| 1. Install packages | 🔴 HIGH | 5 min | ⏳ **DO NOW** |
| 2. Prebuild & run | 🔴 HIGH | 5 min | ⏳ **DO NOW** |
| 3. Fix FriendsScreen lint | 🟡 MEDIUM | 2 min | ⏳ Recommended |
| 4. Test manually | 🟢 LOW | 10 min | Later |
| 5. Add phone to signup | 🟢 LOW | 5 min | Later |

---

## 💡 **Quick Commands Summary:**

```bash
# 1. Install packages
npx expo install expo-contacts expo-sms expo-mail-composer
npm install --save-dev @types/node

# 2. Rebuild
npx expo prebuild --clean
npx expo run:android

# 3. Wait for build to complete
# 4. Test on device!
```

---

## ✅ **Success Criteria:**

After completing steps 1-2, you should be able to:
- ✅ Click "Find Friends" without errors
- ✅ See permission dialog for contacts
- ✅ Grant permission
- ✅ View matched/unmatched contacts
- ✅ Send friend requests
- ✅ Share invitations

---

## 📚 **Reference Documents:**

- `DATABASE_REQUIREMENTS.md` - What we just added
- `CONTACT_BASED_FRIENDS.md` - Contact matching guide
- `FRIEND_INVITATION_SYSTEM.md` - Invitation system guide
- `FRIEND_REQUEST_GUIDE.md` - Friend request flow
- `ENHANCED_CONTACT_MATCHING.md` - Email + phone matching

---

## 🚀 **Start Here:**

1. **Stop current build** (Ctrl+C)
2. **Run install commands** (listed above)
3. **Prebuild and run**
4. **Test!**

Good luck! 🎉
