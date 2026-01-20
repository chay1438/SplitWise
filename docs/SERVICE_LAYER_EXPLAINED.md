# 🔌 Service Layer - What API Calls Do They Make?

## 🎯 **What is the Service Layer?**

The **Service Layer** (`src/services/`) is the **Data Access Layer**. These files make **DIRECT API calls to Supabase**.

Think of it as: **"The place where your app talks to the database"**

---

## 📊 **API Architecture Diagram**

```
┌─────────────────────────────────────────────────────┐
│  YOUR APP (Frontend)                                 │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  UI LAYER (React Components)                 │   │
│  │  src/screens/                                │   │
│  │  - LoginScreen.tsx                           │   │
│  │  - GroupsScreen.tsx                          │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                                │
│                     │ uses hooks                     │
│                     ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │  RTK QUERY LAYER (Caching + State)          │   │
│  │  src/store/api/                              │   │
│  │  - authApi.ts: useSignInMutation()           │   │
│  │  - groupsApi.ts: useGetGroupsQuery()         │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                                │
│                     │ calls service functions        │
│                     ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │  SERVICE LAYER (Data Access) ← YOU ARE HERE │   │
│  │  src/services/                               │   │
│  │  - authService.ts                            │   │
│  │  - groupService.ts                           │   │
│  │  - expenseService.ts                         │   │
│  │  - friendService.ts                          │   │
│  │  - imageUploadService.ts                     │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                                │
│                     │ uses Supabase Client           │
│                     ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │  SUPABASE CLIENT                             │   │
│  │  src/lib/supabase.ts                         │   │
│  │  - Configured with project URL + API key     │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │
                      │ HTTP REST API Calls
                      │ POST/GET/PUT/DELETE
                      ▼
┌─────────────────────────────────────────────────────┐
│  SUPABASE BACKEND (API Server)                      │
│  https://abc.supabase.co/                            │
│  ├─ Authentication API  (/auth/v1/)                 │
│  ├─ Database REST API   (/rest/v1/)                 │
│  └─ Storage API         (/storage/v1/)              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  POSTGRESQL DATABASE                                 │
│  Tables: users, groups, expenses, etc.               │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 **Service Layer = REST API Client**

Your service files are making **REST API calls** to Supabase. Here's what each API looks like:

### **1. Authentication API** (`authService.ts`)
**Endpoint:** `https://your-project.supabase.co/auth/v1/`

```typescript
// authService.ts calls:
supabase.auth.signUp()       → POST /auth/v1/signup
supabase.auth.signInWithPassword() → POST /auth/v1/token
supabase.auth.signOut()      → POST /auth/v1/logout
supabase.auth.getSession()   → GET /auth/v1/token
supabase.auth.resetPasswordForEmail() → POST /auth/v1/recover
```

**Real HTTP Request Example:**
```http
POST https://abc.supabase.co/auth/v1/token
Content-Type: application/json
apikey: your-anon-key

{
  "email": "user@example.com",
  "password": "password123",
  "gotrue_meta_security": {}
}
```

---

### **2. Database REST API** (`groupService.ts`, `expenseService.ts`, etc.)
**Endpoint:** `https://your-project.supabase.co/rest/v1/`

```typescript
// groupService.ts calls:
supabase.from('groups').select()    → GET /rest/v1/groups
supabase.from('groups').insert()    → POST /rest/v1/groups
supabase.from('groups').update()    → PATCH /rest/v1/groups
supabase.from('groups').delete()    → DELETE /rest/v1/groups

// Same for all tables:
supabase.from('expenses').select()  → GET /rest/v1/expenses
supabase.from('group_members').insert() → POST /rest/v1/group_members
```

**Real HTTP Request Example:**
```http
GET https://abc.supabase.co/rest/v1/groups?select=*,members:group_members(profile:profiles(*))&id=in.(abc,xyz)
Headers:
  apikey: your-anon-key
  Authorization: Bearer user-jwt-token
  Content-Type: application/json
```

---

### **3. Storage API** (`imageUploadService.ts`)
**Endpoint:** `https://your-project.supabase.co/storage/v1/`

```typescript
// imageUploadService.ts calls:
supabase.storage.from('receipts').upload() → POST /storage/v1/object/receipts/path
supabase.storage.from('receipts').download() → GET /storage/v1/object/receipts/path
```

**Real HTTP Request Example:**
```http
POST https://abc.supabase.co/storage/v1/object/receipts/user123/receipt.jpg
Headers:
  apikey: your-anon-key
  Authorization: Bearer user-jwt-token
  Content-Type: multipart/form-data

Body: [binary image data]
```

---

## 📂 **Your 9 Service Files Explained**

Here's what each service does:

### **1. `authService.ts`**
**API Used:** Supabase Auth API  
**Endpoints:**
- `supabase.auth.signUp()` → Creates user account
- `supabase.auth.signInWithPassword()` → Logs in user
- `supabase.auth.signOut()` → Logs out user
- `supabase.auth.getSession()` → Gets current session
- `supabase.auth.resetPasswordForEmail()` → Sends password reset
- `supabase.auth.updateUser()` → Updates password

**Example:**
```typescript
export const authService = {
  async signIn(email: string, password: string) {
    // Makes: POST https://abc.supabase.co/auth/v1/token
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }
};
```

---

### **2. `groupService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `groups`, `group_members`  
**Endpoints:**
- `supabase.from('groups').select()` → Get groups
- `supabase.from('groups').insert()` → Create group
- `supabase.from('groups').update()` → Edit group
- `supabase.from('group_members').insert()` → Add member

**Example:**
```typescript
export const groupService = {
  async getGroups(userId: string) {
    // Makes: GET https://abc.supabase.co/rest/v1/group_members?user_id=eq.xyz
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    // Then: GET https://abc.supabase.co/rest/v1/groups?id=in.(abc,def)
    return supabase
      .from('groups')
      .select('*, members:group_members(*)')
      .in('id', groupIds);
  }
};
```

---

### **3. `expenseService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `expenses`, `expense_splits`  
**Endpoints:**
- `supabase.from('expenses').select()` → Get expenses
- `supabase.from('expenses').insert()` → Create expense
- `supabase.from('expense_splits').insert()` → Add splits

---

### **4. `friendService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `friendships`, `profiles`  
**Endpoints:**
- `supabase.from('friendships').select()` → Get friends
- `supabase.from('friendships').insert()` → Add friend
- `supabase.from('profiles').select().ilike()` → Search users

---

### **5. `balanceService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `group_balances_view` (view), `expenses`, `settlements`  
**Endpoints:**
- `supabase.from('group_balances_view').select()` → Get balances
- `supabase.rpc('get_user_total_balance')` → Call function

---

### **6. `settlementService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `settlements`  
**Endpoints:**
- `supabase.from('settlements').insert()` → Record payment

---

### **7. `activityService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `activities`  
**Endpoints:**
- `supabase.from('activities').select()` → Get activity feed

---

### **8. `notificationService.ts`**
**API Used:** Supabase Database REST API  
**Tables:** `notifications`  
**Endpoints:**
- `supabase.from('notifications').select()` → Get notifications
- `supabase.from('notifications').update()` → Mark as read

---

### **9. `imageUploadService.ts`**
**API Used:** Supabase Storage API  
**Bucket:** `receipts`  
**Endpoints:**
- `supabase.storage.from('receipts').upload()` → Upload image
- `supabase.storage.from('receipts').getPublicUrl()` → Get URL

**Example:**
```typescript
export const imageUploadService = {
  async uploadReceipt(userId: string, file: File) {
    // Makes: POST https://abc.supabase.co/storage/v1/object/receipts/user123/abc.jpg
    const filePath = `${userId}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);
    
    if (error) throw error;
    return filePath;
  }
};
```

---

## 🌐 **What HTTP Methods Are Used?**

| Supabase Method | HTTP Method | SQL Equivalent |
|----------------|-------------|----------------|
| `.select()` | GET | SELECT |
| `.insert()` | POST | INSERT |
| `.update()` | PATCH | UPDATE |
| `.delete()` | DELETE | DELETE |
| `.upsert()` | POST | INSERT or UPDATE |
| `.rpc()` | POST | FUNCTION CALL |

---

## 🔐 **How Authentication Works**

Every API call includes these headers:

```http
Headers:
  apikey: eyJhbGc...                    ← Your project's anon key
  Authorization: Bearer eyJhbGc...      ← User's JWT token (when logged in)
```

**For public operations (before login):**
```typescript
// Only apikey is sent
supabase.from('profiles').select()
```

**For authenticated operations (after login):**
```typescript
// Both apikey and Authorization are sent
supabase.from('expenses').insert()  // JWT proves who you are
```

---

## 📦 **Summary: What Each Layer Does**

| Layer | Technology | Purpose | API Calls? |
|-------|-----------|---------|------------|
| **UI Screens** | React Native | Shows data to user | ❌ No |
| **RTK Query** | Redux Toolkit | Caching + state management | ❌ No |
| **Services** | TypeScript | **Makes REST API calls** | ✅ **YES** |
| **Supabase Client** | `@supabase/supabase-js` | Formats HTTP requests | ✅ YES |
| **Supabase Backend** | Supabase Cloud | Receives HTTP, queries PostgreSQL | N/A |

---

## 🎯 **Key Insight**

**Service Layer = REST API Client Layer**

Your services are essentially saying:

```typescript
// Instead of writing:
fetch('https://abc.supabase.co/rest/v1/groups', {
  method: 'POST',
  headers: {
    'apikey': 'xyz',
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Roommates' })
})

// You write:
supabase.from('groups').insert({ name: 'Roommates' })

// Supabase client does the HTTP stuff for you! ✅
```

---

## ✅ **In Simple Terms:**

**Services = The functions that call Supabase APIs**

- **Auth API** for login/signup
- **Database REST API** for CRUD operations
- **Storage API** for file uploads

Each service file groups related API calls together by feature! 🎉
