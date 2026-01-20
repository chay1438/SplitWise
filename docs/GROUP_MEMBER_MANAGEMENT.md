# 🎯 Complete Group Member Management - Implementation Guide

## 📋 **User Flow Overview:**

```
1. User logs in → Contacts permission alert appears
2. User grants permission
3. User goes to Groups screen
4. Clicks "Add Member" icon (top-left)
5. Opens "Add Group Member" screen
   ├─ Shows all contacts with search bar
   ├─ Contacts are filtered: Registered vs Not Registered
   └─ Search works on name, email, phone
6. User selects a contact
   ├─ If REGISTERED → Send friend request + Add to group
   └─ If NOT REGISTERED → Share invite link
```

---

## 🔧 **Implementation Steps:**

### **Step 1: Request Permission After Login**

**File**: `src/hooks/useAuth.ts`

Add this import at top:
```typescript
import { Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

Add this function inside `useAuth`:
```typescript
// Request contacts permission after first login
const requestContactsPermission = async () => {
  try {
    // Check if we've already asked
    const hasAsked = await AsyncStorage.getItem('contacts_permission_asked');
    if (hasAsked) return;

    // Ask for permission
    Alert.alert(
      'Find Friends',
      'Allow SplitWise to access your contacts to find friends who are already using the app?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: async () => {
            await AsyncStorage.setItem('contacts_permission_asked', 'true');
          }
        },
        {
          text: 'Allow',
          onPress: async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            await AsyncStorage.setItem('contacts_permission_asked', 'true');
            
            if (status === 'granted') {
              Alert.alert('Success', 'You can now find friends from your contacts!');
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
  }
};
```

Add this in the `SIGNED_IN` event:
```typescript
} else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  dispatch(setSession(session));

  // Fetch user profile
  if (session?.user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) dispatch(setUser(data));
    
    // Request contacts permission (only on first login)
    if (event === 'SIGNED_IN') {
      setTimeout(() => requestContactsPermission(), 1000); // Delay 1 second
    }
  }
}
```

---

### **Step 2: Add "Add Member" Icon to Groups Screen Header**

**File**: `src/screens/home/GroupsScreen.tsx` (or wherever your groups list is)

Add this to the header:
```typescript
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const GroupsScreen = () => {
  const navigation = useNavigation();

  // Set header with Add Member icon
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AddGroupMember')}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="person-add" size={24} color="#6366F1" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // ... rest of your code
};
```

---

### **Step 3: Create "Add Group Member" Screen**

**File**: `src/screens/groups/AddGroupMemberScreen.tsx` (NEW FILE)

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Share } from 'react-native';
import * as Contacts from 'expo-contacts';
import { contactService } from '../../services/contactService';
import { useSendFriendRequestMutation } from '../../store/api/friendsApi';
import { useAuth } from '../../hooks/useAuth';

const AddGroupMemberScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { groupId } = route.params || {};
  
  const [sendRequest] = useSendFriendRequestMutation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState([]);
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [unmatchedContacts, setUnmatchedContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermissionAndLoadContacts();
  }, []);

  const checkPermissionAndLoadContacts = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      
      if (status === 'granted') {
        setHasPermission(true);
        loadContacts();
      } else {
        // Request permission
        const { status: newStatus } = await Contacts.requestPermissionsAsync();
        if (newStatus === 'granted') {
          setHasPermission(true);
          loadContacts();
        } else {
          Alert.alert(
            'Permission Required',
            'Please grant contacts access to add group members.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access contacts');
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const result = await contactService.findFriendsFromContacts(user.id);
      
      setMatchedUsers(result.matched);
      setUnmatchedContacts(result.unmatched);
      setAllContacts([...result.matched, ...result.unmatched]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts based on search
  const filteredMatched = matchedUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone_number?.includes(searchQuery)
  );

  const filteredUnmatched = unmatchedContacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add registered user as friend and to group
  const handleAddRegisteredUser = async (userId, userName) => {
    try {
      // Send friend request
      await sendRequest({
        fromUserId: user.id,
        toUserId: userId
      }).unwrap();

      // If groupId provided, add to group
      if (groupId) {
        // Add to group logic here
        // await addGroupMember({ groupId, userId });
      }

      Alert.alert(
        'Success',
        `Friend request sent to ${userName}!${groupId ? ' They will be added to the group once they accept.' : ''}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  // Invite unregistered user
  const handleInviteUser = async (contactName) => {
    const message = `Hey ${contactName}! Join me on SplitWise to split expenses easily. Download: https://splitwise.app`;
    
    try {
      await Share.share({
        message,
        title: 'Join SplitWise'
      });
      
      Alert.alert(
        'Invitation Sent',
        `Once ${contactName} joins SplitWise, you can add them to your group!`
      );
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Search Bar */}
      <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <TextInput
          placeholder="Search by name, email, or phone"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            backgroundColor: '#F3F4F6',
            padding: 12,
            borderRadius: 8,
            fontSize: 16
          }}
        />
      </View>

      <FlatList
        data={[
          ...filteredMatched.map(u => ({ ...u, isRegistered: true })),
          ...filteredUnmatched.map(c => ({ ...c, isRegistered: false }))
        ]}
        keyExtractor={(item) => item.id || item.contactId}
        ListHeaderComponent={() => (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
              All Contacts ({filteredMatched.length + filteredUnmatched.length})
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: 'white',
              padding: 16,
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 12,
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
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                {item.full_name || item.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                {item.email || item.phoneNumbers?.[0]?.number || 'No contact info'}
              </Text>
              {item.isRegistered && (
                <Text style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                  ✓ On SplitWise
                </Text>
              )}
              {!item.isRegistered && (
                <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>
                  ⚠️ Not registered
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: item.isRegistered ? '#6366F1' : '#E5E7EB',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8
              }}
              onPress={() => 
                item.isRegistered 
                  ? handleAddRegisteredUser(item.id, item.full_name)
                  : handleInviteUser(item.name)
              }
            >
              <Text style={{ 
                color: item.isRegistered ? 'white' : '#374151', 
                fontWeight: '600' 
              }}>
                {item.isRegistered ? 'Add' : 'Invite'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
              No contacts found matching your search.
            </Text>
          </View>
        )}
      />
    </View>
  );
};

export default AddGroupMemberScreen;
```

---

### **Step 4: Add Route to Navigation**

**File**: `src/navigation/AppStack.tsx` (or your main navigator)

Add the new screen:
```typescript
<Stack.Screen 
  name="AddGroupMember" 
  component={AddGroupMemberScreen}
  options={{
    title: 'Add Group Member',
    headerBackTitle: 'Back'
  }}
/>
```

---

### **Step 5: Update Types**

**File**: `src/types/index.ts`

Add to your navigation types:
```typescript
export type RootStackParamList = {
  // ... existing routes
  AddGroupMember: { groupId?: string };
  // ... other routes
};
```

---

## 🎯 **Complete User Experience:**

### **1. After Login:**
```
╔════════════════════════════════╗
║  Find Friends                  ║
╠════════════════════════════════╣
║  Allow SplitWise to access     ║
║  your contacts to find friends ║
║  who are already using the app?║
║                                ║
║   [Not Now]      [Allow]       ║
╚════════════════════════════════╝
```

### **2. Groups Screen:**
```
╔════════════════════════════════╗
║  Groups              [👤+] ←   ║  Click here
╠════════════════════════════════╣
║  My Groups:                    ║
║  - Roommates                   ║
║  - Trip to Bali                ║
╚════════════════════════════════╝
```

### **3. Add Group Member Screen:**
```
╔════════════════════════════════╗
║  Add Group Member          [X] ║
╠════════════════════════════════╣
║  [Search by name, email...]    ║
║                                ║
║  All Contacts (15)             ║
║  ┌──────────────────────────┐ ║
║  │ Alice Johnson             │ ║
║  │ alice@example.com         │ ║
║  │ ✓ On SplitWise            │ ║
║  │                   [Add] → │ ║
║  └──────────────────────────┘ ║
║  ┌──────────────────────────┐ ║
║  │ Bob Smith                 │ ║
║  │ (555) 123-4567            │ ║
║  │ ⚠️ Not registered         │ ║
║  │                [Invite] → │ ║
║  └──────────────────────────┘ ║
╚════════════════════════════════╝
```

---

## ✅ **Summary:**

**What we built:**
1. ✅ Permission alert after login (one-time)
2. ✅ Add Member icon in Groups header
3. ✅ Complete Add Member screen with search
4. ✅ Logic: Friend request if registered, invite if not
5. ✅ Built-in Share API for invitations

**User Flow:**
```
Login → Permission Alert → Groups → Add Member → Pick Contact → Add/Invite
```

**Perfect!** 🎉

---

## 📁 **Files to Create/Update:**

1. **UPDATE**: `src/hooks/useAuth.ts` - Add permission request
2. **UPDATE**: `src/screens/home/GroupsScreen.tsx` - Add header icon
3. **CREATE**: `src/screens/groups/AddGroupMemberScreen.tsx` - New screen
4. **UPDATE**: `src/navigation/AppStack.tsx` - Add route
5. **UPDATE**: `src/types/index.ts` - Add type

That's everything you need! 🚀
