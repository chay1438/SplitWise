# 🔔 Friend Invitation System - Complete Guide

## 🎯 **The Problem:**

**Scenario:** Alice wants to add Bob as a friend, but Bob hasn't signed up for SplitWise yet.

**What happens?**
- ❌ **Without invitations:** Alice can't do anything. Bob is not found.
- ✅ **With invitations:** Alice can INVITE Bob to join SplitWise!

---

## 📊 **Complete Invitation Flow:**

```
┌─────────────────────────────────────┐
│ 1. Alice clicks "Find Friends"      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. App reads contacts                │
│    - Bob (555-123-4567, bob@mail.com│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Search database for Bob           │
│    phone: 555-123-4567 → Not found   │
│    email: bob@mail.com → Not found   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Bob NOT registered                │
│    Show: "INVITE TO SPLITWISE"       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Alice clicks "Invite Bob"         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Choose invitation method:         │
│    ├─ Share Link (WhatsApp, etc.)    │
│    ├─ Send SMS                        │
│    └─ Send Email                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 7. Bob receives:                     │
│    "Alice invited you to SplitWise!" │
│    [Download Link] [Join Now]        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 8. Bob clicks link                   │
│    → Opens app store / website       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 9. Bob downloads & signs up          │
│    Referral code tracked: Alice      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 10. ✅ Alice & Bob auto-friended!   │
│     Both see "Friend request accept" │
└─────────────────────────────────────┘
```

---

## 🎨 **UI Example:**

### **When Bob IS registered:**
```
┌──────────────────────────────┐
│ 👤 Bob Smith                  │
│ 📱 (555) 123-4567             │
│ ✓ On SplitWise                │
│               [Add Friend] →  │
└──────────────────────────────┘
```

### **When Bob is NOT registered:**
```
┌──────────────────────────────┐
│ 👤 Bob Smith                  │
│ 📱 (555) 123-4567             │
│ ⚠️ Not on SplitWise yet       │
│          [Invite to Join] →   │
└──────────────────────────────┘
```

---

## 🛠️ **Implementation:**

### **Step 1: Update Contact Discovery Screen**

```typescript
import { invitationService } from '../services/invitationService';

const FriendsDiscoveryScreen = () => {
  const { user } = useAuth();
  const [matched, setMatched] = useState([]);
  const [unmatched, setUnmatched] = useState([]);

  const findFriends = async () => {
    const result = await contactService.findFriendsFromContacts(user.id);
    setMatched(result.matched);        // Registered on SplitWise
    setUnmatched(result.unmatched);    // NOT registered
  };

  const handleInvite = async (contact) => {
    try {
      // Option 1: Share via system sheet (WhatsApp, SMS, etc.)
      await invitationService.shareInvite(
        user.full_name,
        user.id,
        contact.name
      );
      
      alert(`Invitation sent to ${contact.name}!`);
    } catch (error) {
      alert('Failed to send invitation');
    }
  };

  return (
    <View>
      {/* Registered Friends */}
      <Text>Friends on SplitWise ({matched.length})</Text>
      <FlatList
        data={matched}
        renderItem={({ item }) => (
          <View>
            <Text>{item.full_name}</Text>
            <Text>✓ On SplitWise</Text>
            <Button title="Add Friend" onPress={() => sendRequest(item.id)} />
          </View>
        )}
      />

      {/* Unregistered Contacts */}
      <Text>Invite Friends ({unmatched.length})</Text>
      <FlatList
        data={unmatched}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name}</Text>
            <Text>⚠️ Not on SplitWise</Text>
            <Button 
              title="Invite to Join" 
              onPress={() => handleInvite(item)} 
            />
          </View>
        )}
      />
    </View>
  );
};
```

---

### **Step 2: Invitation Methods**

#### **Option A: Share Link** (Easiest)
```typescript
const handleInvite = async (contact) => {
  // Opens system share sheet (WhatsApp, SMS, Email, etc.)
  await invitationService.shareInvite(
    user.full_name,
    user.id,
    contact.name
  );
};
```

**User sees:**
```
┌────────────────────────────┐
│  Share via:                │
├────────────────────────────┤
│  WhatsApp                  │
│  SMS                       │
│  Email                     │
│  Messenger                 │
│  Copy Link                 │
└────────────────────────────┘
```

---

#### **Option B: Direct SMS** (If phone available)
```typescript
const handleInviteSMS = async (contact) => {
  if (contact.phoneNumbers?.length > 0) {
    const phone = contact.phoneNumbers[0].number;
    await invitationService.sendSMSInvite(
      phone,
      user.full_name,
      user.id,
      contact.name
    );
  }
};
```

**Bob receives:**
```
📱 SMS from Alice:

"Hey Bob! Alice invited you to SplitWise. 
Join now: https://splitwise.app/invite/abc123"
```

---

#### **Option C: Direct Email** (If email available)
```typescript
const handleInviteEmail = async (contact) => {
  if (contact.emails?.length > 0) {
    const email = contact.emails[0].email;
    await invitationService.sendEmailInvite(
      email,
      user.full_name,
      user.id,
      contact.name
    );
  }
};
```

**Bob receives:**
```
📧 Email from: noreply@splitwise.app
Subject: Alice invited you to SplitWise

Hi Bob!

Alice invited you to join SplitWise - 
the best way to split expenses with friends.

Join now: https://splitwise.app/invite/abc123
```

---

## 🔗 **Deep Linking (Referral Tracking):**

### **When Bob clicks the invite link:**

**Link format:**
```
https://splitwise.app/invite/abc123?from=Alice
```

**What happens:**

1. **On Web:** Shows landing page with "Download App" button
2. **On Mobile:** Opens app if installed, or redirects to app store
3. **After signup:** Automatically connects Alice & Bob as friends

### **Tracking the referral:**

```typescript
// When Bob signs up via invite link
const signUpWithReferral = async (email, password, referralCode) => {
  // 1. Create user account
  const { data: auth } = await supabase.auth.signUp({ email, password });
  
  // 2. Find inviter from referral code
  const inviterId = decodeReferralCode(referralCode);
  
  // 3. Auto-create friendship
  await supabase.from('friendships').insert({
    user_id1: inviterId,    // Alice (inviter)
    user_id2: auth.user.id, // Bob (new user)
    status: 'accepted'      // Auto-accepted!
  });
  
  // 4. Notify Alice
  await supabase.from('notifications').insert({
    user_id: inviterId,
    message: `${email} joined SplitWise via your invitation!`,
    type: 'friend_joined'
  });
};
```

---

## 📊 **Database Schema for Invitations (Optional):**

```sql
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id uuid REFERENCES profiles(id),
  method text,  -- 'sms', 'email', 'share'
  recipient_info text,  -- Phone or email (hashed)
  status text,  -- 'sent', 'accepted', 'expired'
  accepted_user_id uuid REFERENCES profiles(id),  -- Set when they sign up
  created_at timestamp DEFAULT now(),
  accepted_at timestamp
);

-- Track who invited whom
CREATE INDEX idx_invitations_inviter ON invitations(inviter_id);
```

**Benefits:**
- ✅ See who you invited
- ✅ Track which invitations were accepted
- ✅ Reward users for inviting friends (gamification)

---

## 🎯 **Complete Example Screen:**

```typescript
const FriendsDiscoveryScreen = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState({ matched: [], unmatched: [] });

  const findFriends = async () => {
    const result = await contactService.findFriendsFromContacts(user.id);
    setContacts(result);
  };

  return (
    <ScrollView>
      {/* Header */}
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        Find & Invite Friends
      </Text>

      {/* Action Button */}
      <Button title="Scan Contacts" onPress={findFriends} />

      {/* Registered Friends */}
      {contacts.matched.length > 0 && (
        <>
          <Text style={{ fontSize: 18, marginTop: 20 }}>
            Friends on SplitWise ({contacts.matched.length})
          </Text>
          {contacts.matched.map(friend => (
            <FriendCard
              key={friend.id}
              friend={friend}
              action="add"
              onPress={() => sendFriendRequest(friend.id)}
            />
          ))}
        </>
      )}

      {/* Unregistered Contacts */}
      {contacts.unmatched.length > 0 && (
        <>
          <Text style={{ fontSize: 18, marginTop: 20 }}>
            Invite to SplitWise ({contacts.unmatched.length})
          </Text>
          {contacts.unmatched.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              action="invite"
              onPress={() => invitationService.shareInvite(
                user.full_name,
                user.id,
                contact.name
              )}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};
```

---

## ✅ **Summary:**

**When friend is NOT registered:**
1. ✅ Show "Invite to Join" button (instead of "Add Friend")
2. ✅ User clicks → Opens share sheet
3. ✅ User chooses method (WhatsApp, SMS, Email, etc.)
4. ✅ Invitation sent with referral link
5. ✅ Friend signs up → Auto-friended! ✅

**Benefits:**
- ✅ Grow your user base (viral loop)
- ✅ Better user experience (invite friends easily)
- ✅ Track referrals (who invited whom)
- ✅ Auto-friend on signup (seamless!)

---

## 📦 **Required Dependencies:**

```bash
# Install these packages
npx expo install expo-sms
npx expo install expo-mail-composer
```

---

## 🎯 **Files Created:**

1. ✅ `src/services/invitationService.ts` - Invitation logic
2. ✅ `FRIEND_INVITATION_SYSTEM.md` - This guide

**Next steps:**
1. ⏳ Install `expo-sms` and `expo-mail-composer`
2. ⏳ Update UI to show "Invite" for unmatched contacts
3. ⏳ Set up deep linking (optional but recommended)
4. ⏳ Test invitation flow!

---

**This is EXACTLY how SplitWise, Venmo, and other social apps work!** 🎉
