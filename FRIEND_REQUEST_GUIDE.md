# 👥 Friend Request System - Complete Guide

## 🎯 How Friend Requests Work in Your App

Friend requests in your SplitWise app work **by searching for users by name or email**.

---

## 📊 **Friend Request Flow:**

```
Step 1: Search for User
    ↓
Step 2: Send Friend Request (status: pending)
    ↓
Step 3: Other User Receives Request
    ↓
Step 4: They Accept or Reject
    ↓
Step 5: Now Friends! (status: accepted)
    ↓
Step 6: Can Add to Groups
```

---

## 🔍 **Method 1: Search by Name** (Primary)

### **How It Works:**

1. **User types a name** in search box
2. **App searches** `profiles` table for matching names
3. **Results appear** below
4. **User clicks "Add Friend"** on desired person
5. **Friend request sent** (status: pending)

### **Code Example:**

```typescript
// In AddFriendScreen.tsx
const [searchQuery, setSearchQuery] = useState('');
const [searchUsers] = useSearchUsersMutation();
const [sendRequest] = useSendFriendRequestMutation();
const { user } = useAuth();

const handleSearch = async () => {
  const { data } = await searchUsers(searchQuery);
  // data = [{ id: 'abc', full_name: 'Alice Johnson', email: 'alice@example.com' }]
  setResults(data);
};

const handleSendRequest = async (toUserId) => {
  await sendRequest({
    fromUserId: user.id,
    toUserId: toUserId
  });
  alert('Friend request sent!');
};
```

### **UI Example:**

```
┌────────────────────────────────────┐
│  Add Friend                     [X]│
├────────────────────────────────────┤
│                                    │
│  Search: [Alice             ] 🔍  │
│                                    │
│  Results:                          │
│  ┌──────────────────────────────┐ │
│  │ Alice Johnson                 │ │
│  │ alice@example.com             │ │
│  │               [Add Friend] →  │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Alice Smith                   │ │
│  │ alice.smith@example.com       │ │
│  │               [Add Friend] →  │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## 📧 **Method 2: Search by Email** (Secondary)

### **How It Works:**

1. **User enters exact email**
2. **App searches** for that specific email
3. **If found**, shows the user
4. **User clicks "Add Friend"**

### **Code Example:**

```typescript
const [searchByEmail] = useSearchUserByEmailMutation();
const [sendRequest] = useSendFriendRequestMutation();

const handleSearchByEmail = async (email) => {
  const { data: user } = await searchByEmail(email);
  
  if (!user) {
    alert('User not found');
    return;
  }
  
  // Show user, allow sending request
  setFoundUser(user);
};

const handleSendRequest = async () => {
  await sendRequest({
    fromUserId: currentUser.id,
    toUserId: foundUser.id
  });
  alert('Friend request sent!');
};
```

---

## 🔔 **Receiving Friend Requests:**

### **Code Example:**

```typescript
// In FriendRequestsScreen.tsx
const { user } = useAuth();
const { data: pendingRequests } = useGetPendingRequestsQuery(user.id);
const [acceptRequest] = useAcceptFriendRequestMutation();
const [rejectRequest] = useRejectFriendRequestMutation();

const handleAccept = async (requestId) => {
  await acceptRequest({ requestId, userId: user.id });
  alert('Friend request accepted!');
};

const handleReject = async (requestId) => {
  await rejectRequest({ requestId, userId: user.id });
  alert('Friend request rejected');
};
```

### **UI Example:**

```
┌────────────────────────────────────┐
│  Friend Requests                   │
├────────────────────────────────────┤
│                                    │
│  Pending Requests (2):             │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 👤 Bob Smith                  │ │
│  │    bob@example.com             │ │
│  │    Sent: 2 hours ago           │ │
│  │    [✓ Accept] [✗ Reject]      │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 👤 Charlie Brown              │ │
│  │    charlie@example.com         │ │
│  │    Sent: 1 day ago             │ │
│  │    [✓ Accept] [✗ Reject]      │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

---

## 📋 **Database Structure:**

### **friendships Table:**

```sql
CREATE TABLE friendships (
  id uuid PRIMARY KEY,
  user_id1 uuid,  -- Sender
  user_id2 uuid,  -- Recipient
  status text,    -- 'pending', 'accepted', 'blocked'
  created_at timestamp
);
```

### **Example Data:**

| id | user_id1 (Sender) | user_id2 (Recipient) | status | created_at |
|----|-------------------|----------------------|--------|------------|
| 1  | bob-id | alice-id | pending | 2026-01-05 10:00 |
| 2  | alice-id | charlie-id | accepted | 2026-01-04 15:30 |
| 3  | bob-id | charlie-id | accepted | 2026-01-03 09:15 |

---

## 🎯 **Complete Flow Example:**

### **Scenario: Bob wants to add Alice as a friend**

**Step 1: Bob searches for Alice**
```typescript
// Bob types "Alice" in search
const { data } = await searchUsers('Alice');
// Returns:
// [
//   { id: 'alice-id', full_name: 'Alice Johnson', email: 'alice@example.com' },
//   { id: 'alice2-id', full_name: 'Alice Smith', email: 'alice.smith@gmail.com' }
// ]
```

**Step 2: Bob sends request to Alice Johnson**
```typescript
await sendRequest({
  fromUserId: 'bob-id',    // Bob
  toUserId: 'alice-id'     // Alice Johnson
});

// Database INSERT:
// { user_id1: 'bob-id', user_id2: 'alice-id', status: 'pending' }
```

**Step 3: Alice sees the pending request**
```typescript
// Alice opens Friend Requests screen
const { data: requests } = await getPendingRequests('alice-id');
// Returns:
// [
//   {
//     id: 'request-123',
//     user_id1: 'bob-id',
//     sender: { full_name: 'Bob Smith', email: 'bob@example.com' }
//   }
// ]
```

**Step 4: Alice accepts**
```typescript
await acceptRequest({
  requestId: 'request-123',
  userId: 'alice-id'  // Must be alice (recipient)
});

// Database UPDATE:
// SET status = 'accepted' WHERE id = 'request-123'
```

**Step 5: Now they're friends!**
```typescript
// Bob queries his friends
const { data: friends } = await getFriends('bob-id');
// Returns Alice in the list!

// Alice queries her friends
const { data: friends } = await getFriends('alice-id');
// Returns Bob in the list!
```

**Step 6: Bob can now add Alice to groups**
```typescript
// Bob creates a group and adds Alice
await addGroupMember({
  groupId: 'roommates-id',
  userId: 'alice-id'
});
// ✅ SUCCESS - They're friends!
```

---

## 🎨 **UI Screens You Need:**

### **1. Add Friend Screen**
- Search box (name or email)
- Results list
- "Add Friend" button on each result

### **2. Friend Requests Screen**
- List of pending requests **received**
- "Accept" and "Reject" buttons
- Optional: Show "Sent requests" (requests you sent that are pending)

### **3. Friends List Screen** (You already have this!)
- Shows accepted friends
- Can navigate to "Add Friend" from here

---

## 🔐 **Security (RLS Policies):**

After running `friends_only_groups.sql`, these rules apply:

| Action | Who Can Do It | Policy |
|--------|--------------|--------|
| **Send friend request** | Anyone | Must be sender (user_id1) |
| **Accept request** | Only recipient | Must be user_id2, can set to 'accepted' |
| **Reject request** | Only recipient | Must be user_id2, can delete |
| **View friendships** | Both users | Either user_id1 or user_id2 |
| **Unfriend** | Either user | Either user_id1 or user_id2 can delete |

---

## ✅ **What You Need to Build:**

### **Frontend Screens:**

1. **AddFriendScreen** - Search and send requests ✅ (just update existing)
2. **FriendRequestsScreen** - Accept/reject requests ⚠️ (needs creation)
3. **FriendsScreen** - List of friends ✅ (you already have this!)

### **Backend:**

1. ✅ **friendService.ts** - Updated with new functions
2. ✅ **friendsApi.ts** - Updated with new hooks
3. ⏳ **friends_only_groups.sql** - Run this in Supabase!

---

## 🚀 **Next Steps:**

1. ✅ **Backend is ready** (friendService + friendsApi updated)
2. ⏳ **Run SQL script** (`friends_only_groups.sql` in Supabase)
3. ⏳ **Update FriendsScreen** to show pending requests
4. ⏳ **Add "Add Friend" button** to navigate to search
5. ⏳ **Test the flow** with 2 users

---

## 💡 **Summary:**

**How friend requests are sent:**
- ✅ By **searching for name** (primary method)
- ✅ By **entering exact email** (secondary method)
- ✅ Future: QR code, invite link (can add later)

**Your app uses:** Search by name OR email → Send request → Accept/Reject → Friends!

**This is exactly how real SplitWise works!** 🎉
