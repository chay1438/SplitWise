# 📱 Contact-Based Friend Discovery - Implementation Guide

## 🎯 **Overview**

Your SplitWise app will find friends using **device contacts** (phone numbers), with **email search** as a fallback.

**This is exactly how real SplitWise works!** ✅

---

## 📊 **Complete User Flow:**

```
1. User opens app
    ↓
2. Check if logged in
    ├─ NO → Redirect to Login/Signup
    └─ YES → Continue
    ↓
3. User clicks "Add Friend"
    ↓
4. Show options:
    ├─ "Find from Contacts" (Primary)
    └─ "Search by Email" (Fallback)
    ↓
5a. If "Find from Contacts":
    ├─ Request contacts permission
    ├─ Read device contacts
    ├─ Match with registered users (by phone)
    ├─ Show matched friends: "Alice is on SplitWise!"
    └─ Send friend request
    ↓
5b. If "Search by Email":
    ├─ User types email
    ├─ Search database
    ├─ Show result
    └─ Send friend request
```

---

## 🔧 **Implementation Steps:**

### **Step 1: Install Dependencies**

```bash
# In your project directory
npx expo install expo-contacts
```

---

### **Step 2: Update Database Schema**

Run this in **Supabase SQL Editor**:

```sql
-- Add phone_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Create index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone 
ON public.profiles(phone_number);

-- Update RLS policy to allow phone search
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

CREATE POLICY "Public profiles viewable" 
ON public.profiles 
FOR SELECT 
USING (true);  -- Anyone can search profiles (needed for contact matching)
```

---

### **Step 3: Update Profile Creation**

When users sign up, capture their phone number:

```typescript
// In SignUpScreen.tsx
const [phoneNumber, setPhoneNumber] = useState('');

const handleSignUp = async () => {
  // Create auth user
  const { data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: fullName,
        phone: phoneNumber  // Add phone to metadata
      }
    }
  });

  // Profile is created automatically by trigger
  // But we can update the phone number
  if (phoneNumber) {
    await supabase
      .from('profiles')
      .update({ phone_number: phoneNumber })
      .eq('id', authData.user.id);
  }
};
```

---

### **Step 4: Create FriendsDiscoveryScreen**

```typescript
// src/screens/friends/FriendsDiscoveryScreen.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { contactService } from '../../services/contactService';
import { useSendFriendRequestMutation } from '../../store/api/friendsApi';
import { useAuth } from '../../hooks/useAuth';

export default function FriendsDiscoveryScreen() {
  const { user } = useAuth();
  const [matchedFriends, setMatchedFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendRequest] = useSendFriendRequestMutation();

  const findFriendsFromContacts = async () => {
    setLoading(true);
    try {
      const { matched, unmatched } = await contactService.findFriendsFromContacts(user.id);
      setMatchedFriends(matched);
      
      if (matched.length === 0) {
        alert('No friends found from contacts. Try searching by email!');
      } else {
        alert(`Found ${matched.length} friends from your contacts!`);
      }
    } catch (error) {
      if (error.message === 'Contacts permission denied') {
        alert('Please allow contacts access to find friends');
      } else {
        alert('Error finding friends');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    try {
      await sendRequest({
        fromUserId: user.id,
        toUserId: friendId
      });
      alert('Friend request sent!');
    } catch (error) {
      alert('Failed to send request');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Find Friends
      </Text>

      {/* Primary Option: Contacts */}
      <TouchableOpacity
        style={{
          backgroundColor: '#6366F1',
          padding: 16,
          borderRadius: 12,
          marginBottom: 16
        }}
        onPress={findFriendsFromContacts}
        disabled={loading}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          📱 Find from Contacts
        </Text>
      </TouchableOpacity>

      {/* Secondary Option: Email Search */}
      <TouchableOpacity
        style={{
          backgroundColor: '#E5E7EB',
          padding: 16,
          borderRadius: 12,
          marginBottom: 20
        }}
        onPress={() => {/* Navigate to email search */}}
      >
        <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          📧 Search by Email
        </Text>
      </TouchableOpacity>

      {/* Loading */}
      {loading && (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 20 }} />
      )}

      {/* Matched Friends List */}
      {matchedFriends.length > 0 && (
        <>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            Friends on SplitWise ({matchedFriends.length})
          </Text>
          <FlatList
            data={matchedFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: 'white',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                    {item.full_name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    {contactService.formatPhoneNumber(item.phone_number)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                    ✓ On SplitWise
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#6366F1',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8
                  }}
                  onPress={() => handleSendRequest(item.id)}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    Add Friend
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

      {/* No matches */}
      {!loading && matchedFriends.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
            No contacts found on SplitWise yet.{'\n'}
            Try searching by email instead!
          </Text>
        </View>
      )}
    </View>
  );
}
```

---

### **Step 5: Update Android Permissions**

Add to **`app.json`**:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow SplitWise to access your contacts to find friends who are already using the app."
        }
      ]
    ],
    "android": {
      "permissions": [
        "READ_CONTACTS"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSContactsUsageDescription": "SplitWise needs access to your contacts to help you find friends who are already using the app."
      }
    }
  }
}
```

---

### **Step 6: iOS Permissions**

For iOS, the permission message is shown in **Info.plist**. Expo handles this automatically when you add the plugin above.

---

## 🎯 **Complete Flow with Authentication Check:**

```typescript
// In your navigation or initial screen
import { useAuth } from '../hooks/useAuth';

const App = () => {
  const { session, user } = useAuth();

  if (!session) {
    // User NOT logged in → Show Auth screens
    return <AuthStack />;
  }

  // User IS logged in → Can access Friends features
  return <AppStack />;
};
```

**This means:**
- ✅ Users **must** log in before accessing Friends screen
- ✅ No authentication needed in individual screens (handled at root level)
- ✅ Non-authenticated users automatically redirected to Login/Signup

---

## 📱 **UI Mockup:**

```
┌────────────────────────────────────┐
│  Find Friends                   [X]│
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │  📱 Find from Contacts        │ │
│  │  Find friends who use         │ │
│  │  SplitWise                    │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  📧 Search by Email           │ │
│  │  Enter friend's email         │ │
│  └──────────────────────────────┘ │
│                                    │
│  ─────────────────────────────────│
│                                    │
│  Friends on SplitWise (3)         │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Alice Johnson                 │ │
│  │ (555) 123-4567                │ │
│  │ ✓ On SplitWise                │ │
│  │               [Add Friend] →  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Bob Smith                     │ │
│  │ (555) 987-6543                │ │
│  │ ✓ On SplitWise                │ │
│  │               [Add Friend] →  │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

---

## ✅ **What Gets Created:**

### **Files:**
1. ✅ `src/services/contactService.ts` - Contact matching logic
2. ⏳ `src/screens/friends/FriendsDiscoveryScreen.tsx` - UI screen
3. ⏳ Update `app.json` - Add permissions

### **Database:**
1. ⏳ Add `phone_number` column to `profiles` table
2. ⏳ Create index on `phone_number`

### **Dependencies:**
1. ⏳ Install `expo-contacts`

---

## 🔐 **Security & Privacy:**

**What happens to contact data:**
- ✅ **Contacts stay on device** - Never uploaded to server
- ✅ **Only phone numbers** are sent to match with database
- ✅ **User controls** - Can deny permission
- ✅ **Matches only** - Only shows users already on SplitWise

**Privacy Flow:**
1. Ask permission → User approves
2. Read contacts → Stays on device
3. Extract phone numbers → Send to database
4. Match with registered users → Return matches only
5. Show matched friends → User decides who to add

---

## 🎯 **Next Steps:**

### **1. Install Dependency**
```bash
npx expo install expo-contacts
```

### **2. Update Database**
Run the SQL script above in Supabase

### **3. Update app.json**
Add the permissions configuration

### **4. Create the Screen**
Create `FriendsDiscoveryScreen.tsx` with the code above

### **5. Add Navigation**
Add a button from `FriendsScreen` → `FriendsDiscoveryScreen`

### **6. Test**
- Grant contacts permission
- Add phone numbers to test user profiles
- See matching work!

---

## 💡 **Summary:**

**Your app will:**
- ✅ Require authentication (already works!)
- ✅ Find friends from contacts (phone matching)
- ✅ Fallback to email search
- ✅ Send friend requests (pending → accept)
- ✅ Privacy-respecting (contacts stay on device)

**This is EXACTLY how real SplitWise works!** 🎉
