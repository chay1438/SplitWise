# 🧪 Testing Guide - Group Member Management

## ✅ **Pre-Requisites:**

Ensure you have run the following commands (or user has):
1. `npx expo install expo-contacts @react-native-async-storage/async-storage`
2. `npx expo run:android` (rebuild is required for permissions)

---

## 📱 **Test Scenarios:**

### **Test 1: Permission Request**
1. **Action:** Log out and log back in (or restart app if already logged in).
2. **Expected:** An alert should appear: "Find Friends - Allow SplitWise to access your contacts...".
3. **Action:** Tap "Allow".
4. **Expected:** System permission dialog appears. Tap "Allow" again.

### **Test 2: Access "Add Member" Screen**
1. **Action:** Navigate to **Groups** tab.
2. **Action:** Tap on any group to view details.
3. **Expected:** In the top right header, you should see a "👤+" icon next to the settings icon.
4. **Action:** Tap the "👤+" icon.
5. **Expected:** "Add Group Member" screen opens.

### **Test 3: View & Search Contacts**
1. **Action:** On "Add Group Member" screen, verify list of contacts is loading.
2. **Expected:** 
   - You should see contacts listed.
   - Some may have "✓ On SplitWise" (if they are registered users).
   - Others should say "⚠️ Not registered".
3. **Action:** Type into the search bar.
4. **Expected:** List filters by name, email, or phone.

### **Test 4: Add Registered User**
1. **Action:** Find a contact marked "✓ On SplitWise".
2. **Action:** Tap the "Add" button.
3. **Expected:**
   - Loading indicator or confirmation.
   - Alert: "Success - Friend request sent to [Name]!".

### **Test 5: Invite Unregistered User**
1. **Action:** Find a contact marked "⚠️ Not registered".
2. **Action:** Tap the "Invite" button.
3. **Expected:**
   - System Share Sheet opens.
   - You can choose WhatsApp, Messages, etc.
   - Message text includes invite link.

---

## 🐛 **Troubleshooting:**

- **Permission not asking?** 
  - We store `contacts_permission_asked` in AsyncStorage. To reset, clear app data or reinstall.
  
- **Contacts not loading?**
  - Ensure you have contacts on your simulator/emulator. IF running on emulator, you may need to add dummy contacts manually in the Contacts app.

- **No "On SplitWise" matches?**
  - Ensure the phone number in your contact matches exactly with a registered user's `phone_number` in Supabase `profiles` table.
  - You can manually update a profile in Supabase to match a dummy contact's phone number for testing.
