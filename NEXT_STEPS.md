# 🚀 Next Steps & Progress

## ✅ **Recently Completed (Invitation System):**
- ✅ **Deep Linking Config:** Set up `splitwise://` scheme in `app.json` & `RootNavigation`.
- ✅ **Backend Security:** Created `group_invitations` table & RPC function for secure joining.
- ✅ **Invite Generation:** Added `useCreateInvitationMutation` (RTK Query) to generate unique tokens.
- ✅ **Secure Joining:** Added `useJoinGroupMutation` to validate tokens and add members.
- ✅ **Sharing UI:** Implemented "Invite via Link" in Group Settings & "Invite to App" in Add Friend.
- ✅ **Refactor:** Moved logic to `invitationsApi.ts` and used `react-native-uuid`.
- ✅ **Build:** Ran `npx expo prebuild` to sync native dependencies.

---

## 🎯 **Current Focus: Testing**

### **1. 📱 Test on Device (After Prebuild completes)**
Since we just ran prebuild, you need to launch the app again:
```bash
npx expo run:android
```

**Test Scenarios:**
1.  **Invite to App:**
    *   Go to `Friends` -> `Add Friend`.
    *   Find a contact (not on Splitwise).
    *   Click **Invite**.
    *   Check if WhatsApp/Share sheet opens with the link.
2.  **Invite to Group:**
    *   Go to a Group -> Settings (Gear icon).
    *   Click **Invite via Link**.
    *   Send the link to yourself (e.g., via "Note to Self" in WhatsApp).
    *   **Click the link.**
    *   Verify the app opens and (if logged in) accepts the invite.

---

## 🔮 **Upcoming Features / Improvements**

| Feature | Status | Description |
| :--- | :--- | :--- |
| **1. Activity Feed** | 🚧 In Progress | Ensure `ActivityScreen` shows real-time updates when expenses/groups are added. |
| **2. Push Notifications** | ⏳ Pending | detailed notifications when someone adds an expense or invites you. |
| **3. Settle Up (Advanced)** | ⏳ Pending | Improve `SettleUpScreen` to record payments with specific payment methods (UPI, Cash). |
| **4. Profiling/Optimization** | ⏳ Pending | Check performance of contact loading and list rendering. |

---

## 💡 **Technical Notes**
- **UUID:** We now use `react-native-uuid` instead of a manual polyfill.
- **Deep Linking:** The entry point is `RootNavigation.tsx` -> `handleDeepLink`.
- **API:** All invitation logic is in `src/store/api/invitationsApi.ts`.
