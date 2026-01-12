# 🔌 Frontend API Integration Architecture

## 📋 **How Your App Talks to the Backend**

Your app uses a **3-layer architecture** for API integration:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: UI Components (Screens)                       │
│  src/screens/                                            │
│  ├─ LoginScreen.tsx                                      │
│  ├─ AddExpenseScreen.tsx                                 │
│  └─ GroupDetailsScreen.tsx                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ useQuery / useMutation hooks
                 ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Redux Toolkit Query (RTK Query)               │
│  src/store/api/                                          │
│  ├─ authApi.ts       (signup, login, logout)            │
│  ├─ groupsApi.ts     (CRUD for groups)                   │
│  ├─ expensesApi.ts   (CRUD for expenses)                 │
│  ├─ friendsApi.ts    (friend operations)                 │
│  └─ balanceApi.ts    (get balances)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Calls service functions
                 ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Service Layer (Supabase Client)               │
│  src/services/                                           │
│  ├─ authService.ts   (direct Supabase calls)            │
│  ├─ groupService.ts  (direct Supabase calls)            │
│  ├─ expenseService.ts                                    │
│  └─ friendService.ts                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ supabase.from('table').select()
                 ▼
┌─────────────────────────────────────────────────────────┐
│  SUPABASE CLIENT                                         │
│  src/lib/supabase.ts                                     │
│  Configured with your project URL + API key              │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP REST API
                 ▼
┌─────────────────────────────────────────────────────────┐
│  SUPABASE BACKEND                                        │
│  PostgreSQL Database                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ **Layer-by-Layer Breakdown**

### **LAYER 0: Supabase Client Configuration**
**File:** `src/lib/supabase.ts`

This is where your app connects to Supabase:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**What this does:**
- ✅ Creates a single Supabase client instance
- ✅ Reads credentials from `.env` file
- ✅ Configures to use AsyncStorage (for session persistence)
- ✅ Enables auto token refresh (no logout when token expires)

**Location:** `src/lib/supabase.ts`

---

### **LAYER 1: Service Layer** 
**Directory:** `src/services/`

These files contain **direct Supabase database calls** - the lowest level of data access.

#### **Example: `authService.ts`**

```typescript
import { supabase } from '../lib/supabase';

export const authService = {
  // Sign up a new user
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: fullName }  // Stored in user metadata
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign in existing user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }
};
```

**Location:** `src/services/authService.ts`

---

#### **Example: `groupService.ts`**

```typescript
import { supabase } from '../lib/supabase';

export const groupService = {
  // Get all groups for a user
  async getGroups(userId: string) {
    // 1. First get group IDs where user is a member
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    const groupIds = memberships.map(m => m.group_id);

    // 2. Then get full group details with members
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(
          profile:profiles!user_id(*)
        )
      `)
      .in('id', groupIds);

    if (error) throw error;
    return data;
  },

  // Create a new group
  async createGroup(data: { 
    name: string; 
    type: string; 
    createdBy: string; 
    memberIds?: string[] 
  }) {
    // 1. Create the group
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        type: data.type,
        created_by: data.createdBy
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Add members (including creator)
    const allMembers = [...(data.memberIds || []), data.createdBy];
    const memberInserts = allMembers.map(userId => ({
      group_id: group.id,
      user_id: userId
    }));

    await supabase.from('group_members').insert(memberInserts);

    return group;
  }
};
```

**Location:** `src/services/groupService.ts`

---

### **LAYER 2: RTK Query API Slices**
**Directory:** `src/store/api/`

These files define **React hooks** for data fetching using Redux Toolkit Query.

#### **Example: `authApi.ts`**

```typescript
import { apiSlice } from './apiSlice';
import { authService } from '../../services/authService';
import { setSession, setUser } from '../slices/authSlice';

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // QUERIES (for fetching data)
    initializeAuth: builder.query({
      queryFn: async () => {
        const session = await authService.getSession();
        // ... fetch user profile
        return { data: { session, user: profile } };
      },
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;
        dispatch(setSession(data.session));
        dispatch(setUser(data.user));
      }
    }),

    // MUTATIONS (for changing data)
    signOut: builder.mutation({
      queryFn: async () => {
        await authService.signOut();
        return { data: null };
      },
      onQueryStarted: async (_, { dispatch }) => {
        dispatch(setSession(null));
        dispatch(setUser(null));
      }
    }),

    signIn: builder.mutation({
      queryFn: async ({ email, password }) => {
        await authService.signIn(email, password);
        return { data: null };
      }
    }),

    signUp: builder.mutation({
      queryFn: async ({ email, password, name }) => {
        await authService.signUp(email, password, name);
        return { data: null };
      }
    })
  })
});

// Export hooks for use in components
export const { 
  useInitializeAuthQuery, 
  useSignOutMutation, 
  useSignInMutation, 
  useSignUpMutation 
} = authApiSlice;
```

**What this does:**
- ✅ Wraps service calls in RTK Query
- ✅ Auto-generates React hooks
- ✅ Handles loading/error states automatically
- ✅ Updates Redux store when data changes
- ✅ Provides caching

**Location:** `src/store/api/authApi.ts`

---

#### **Example: `groupsApi.ts`**

```typescript
import { apiSlice } from './apiSlice';
import { groupService } from '../../services/groupService';

export const groupsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch all groups for current user
    getGroups: builder.query({
      queryFn: async (userId: string) => {
        try {
          const data = await groupService.getGroups(userId);
          return { data };
        } catch (error: any) {
          return { error: error.message };
        }
      },
      providesTags: ['Groups']  // For cache invalidation
    }),

    // Create a new group
    createGroup: builder.mutation({
      queryFn: async (groupData) => {
        try {
          const data = await groupService.createGroup(groupData);
          return { data };
        } catch (error: any) {
          return { error: error.message };
        }
      },
      invalidatesTags: ['Groups']  // Refetch groups after creating
    })
  })
});

export const { useGetGroupsQuery, useCreateGroupMutation } = groupsApiSlice;
```

**Location:** `src/store/api/groupsApi.ts`

---

### **LAYER 3: UI Components (Screens)**
**Directory:** `src/screens/`

Screens use the **hooks** from RTK Query to fetch/mutate data.

#### **Example: `LoginScreen.tsx`**

```typescript
import { useSignInMutation } from '../../store/api/authApi';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Get the mutation hook
  const [signIn, { isLoading }] = useSignInMutation();

  const handleLogin = async () => {
    try {
      // Call the mutation
      await signIn({ email, password }).unwrap();
      // Success! Navigation handled by auth listener
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} />
      <Button 
        title={isLoading ? 'Logging in...' : 'Login'} 
        onPress={handleLogin} 
      />
    </View>
  );
}
```

**Location:** `src/screens/auth/LoginScreen.tsx`

---

#### **Example: `GroupDetailsScreen.tsx`**

```typescript
import { useGetGroupsQuery } from '../../store/api/groupsApi';

export default function GroupDetailsScreen() {
  const { user } = useAuth();
  
  // Fetch groups automatically
  const { data: groups, isLoading, error, refetch } = useGetGroupsQuery(user.id);

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error loading groups</Text>;

  return (
    <FlatList
      data={groups}
      renderItem={({ item }) => <GroupCard group={item} />}
      onRefresh={refetch}  // Pull to refresh
      refreshing={isLoading}
    />
  );
}
```

**Location:** `src/screens/groups/GroupDetailsScreen.tsx`

---

## 🔄 **Complete Data Flow Example**

Let's trace what happens when a user **creates a group**:

### **Step 1: User Interaction (UI)**
```typescript
// In CreateGroupScreen.tsx
<Button 
  title="Create Group" 
  onPress={() => handleCreateGroup()} 
/>
```

### **Step 2: Call Mutation Hook**
```typescript
// In CreateGroupScreen.tsx
const [createGroup, { isLoading }] = useCreateGroupMutation();

const handleCreateGroup = async () => {
  await createGroup({
    name: 'Roommates',
    type: 'Home',
    createdBy: user.id,
    memberIds: ['friend-1-id', 'friend-2-id']
  }).unwrap();
};
```

### **Step 3: RTK Query Calls Service**
```typescript
// In src/store/api/groupsApi.ts
createGroup: builder.mutation({
  queryFn: async (groupData) => {
    const data = await groupService.createGroup(groupData);
    return { data };
  }
})
```

### **Step 4: Service Calls Supabase**
```typescript
// In src/services/groupService.ts
async createGroup(data) {
  // INSERT INTO groups (name, type, created_by) VALUES (...)
  const { data: group } = await supabase
    .from('groups')
    .insert({ ... })
    .select()
    .single();

  // INSERT INTO group_members (group_id, user_id) VALUES (...)
  await supabase
    .from('group_members')
    .insert(memberInserts);

  return group;
}
```

### **Step 5: Supabase Client Sends HTTP Request**
```typescript
// In src/lib/supabase.ts (automatic)
POST https://your-project.supabase.co/rest/v1/groups
Headers: {
  apikey: 'your-anon-key',
  Authorization: 'Bearer user-jwt-token',
  Content-Type: 'application/json'
}
Body: {
  name: 'Roommates',
  type: 'Home',
  created_by: 'user-uuid'
}
```

### **Step 6: Supabase Backend (PostgreSQL)**
```sql
-- RLS policies are checked first
-- Then the INSERT is executed
INSERT INTO public.groups (name, type, created_by)
VALUES ('Roommates', 'Home', 'user-uuid')
RETURNING *;

-- Database trigger fires: on_auth_user_created (if applicable)
-- Response sent back as JSON
```

### **Step 7: Data Flows Back to UI**
```typescript
// RTK Query automatically:
// 1. Invalidates 'Groups' cache
// 2. Refetches groups list
// 3. Updates Redux store
// 4. Re-renders components using that data

// In GroupListScreen.tsx - automatically updates!
const { data: groups } = useGetGroupsQuery(userId);
// groups now includes the new group! ✅
```

---

## 📂 **File Structure Overview**

```
src/
├── lib/
│   └── supabase.ts              # Supabase client setup
│
├── services/                    # Direct DB calls
│   ├── authService.ts           # Auth operations
│   ├── groupService.ts          # Group CRUD
│   ├── expenseService.ts        # Expense CRUD
│   ├── friendService.ts         # Friend operations
│   └── imageUploadService.ts    # Receipt uploads
│
├── store/
│   ├── api/                     # RTK Query API slices
│   │   ├── apiSlice.ts          # Base API config
│   │   ├── authApi.ts           # Auth hooks
│   │   ├── groupsApi.ts         # Group hooks
│   │   ├── expensesApi.ts       # Expense hooks
│   │   ├── friendsApi.ts        # Friend hooks
│   │   ├── balanceApi.ts        # Balance hooks
│   │   ├── settlementsApi.ts    # Settlement hooks
│   │   ├── activitiesApi.ts     # Activity hooks
│   │   └── notificationsApi.ts  # Notification hooks
│   │
│   └── slices/                  # Redux state slices
│       ├── authSlice.ts         # Auth state
│       ├── uiSlice.ts           # UI state
│       └── expenseSlice.ts      # Expense state
│
└── screens/                     # UI components
    ├── auth/
    │   ├── LoginScreen.tsx      # Uses useSignInMutation
    │   └── SignUpScreen.tsx     # Uses useSignUpMutation
    ├── groups/
    │   ├── GroupsScreen.tsx     # Uses useGetGroupsQuery
    │   └── CreateGroupScreen.tsx # Uses useCreateGroupMutation
    └── expenses/
        └── AddExpenseScreen.tsx # Uses useCreateExpenseMutation
```

---

## 🎯 **Key Files Explained**

### **1. `src/lib/supabase.ts`**
**Purpose:** Supabase client instance
**Used by:** All service files
**Created once, imported everywhere**

---

### **2. `src/services/*.ts`**
**Purpose:** Abstraction layer for database operations
**Pattern:** Pure functions that return promises
**Example:**
```typescript
export const groupService = {
  async getGroups(userId) { /* ... */ },
  async createGroup(data) { /* ... */ }
};
```

---

### **3. `src/store/api/apiSlice.ts`**
**Purpose:** Base RTK Query configuration
```typescript
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Groups', 'Expenses', 'Friends'],
  endpoints: () => ({})
});
```

---

### **4. `src/store/api/*Api.ts`**
**Purpose:** Inject endpoints into base API
**Pattern:** 
```typescript
export const groupsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query({ /* ... */ }),
    createGroup: builder.mutation({ /* ... */ })
  })
});

export const { useGetGroupsQuery, useCreateGroupMutation } = groupsApi;
```

---

### **5. UI Components**
**Purpose:** Consume hooks from API slices
**Pattern:**
```typescript
const [mutate, { isLoading, error }] = useMutation();
const { data, isLoading, error, refetch } = useQuery(params);
```

---

## ✅ **Benefits of This Architecture**

1. ✅ **Separation of Concerns**
   - Services: How to talk to DB
   - RTK Query: When to fetch data, caching
   - Screens: What to show users

2. ✅ **Type Safety**
   - TypeScript throughout
   - Database types match frontend types

3. ✅ **Automatic Caching**
   - RTK Query caches responses
   - No redundant API calls

4. ✅ **Loading States**
   - `isLoading` automatically provided
   - No manual state management needed

5. ✅ **Error Handling**
   - Centralized in RTK Query
   - Try/catch in services

6. ✅ **Easy Testing**
   - Service layer can be mocked
   - Components can be tested independently

---

## 🎓 **Summary**

**Your API integration uses:**
```
UI (Screens)
    ↓ use hooks
RTK Query API
    ↓ calls
Service Layer
    ↓ uses
Supabase Client
    ↓ sends
HTTP requests to Supabase
```

**This is PROFESSIONAL, INDUSTRY-STANDARD architecture!** ✅

**Key insight:** You never write raw fetch() calls. Supabase client handles HTTP, services handle business logic, RTK Query handles caching/state, and components just consume hooks. Clean! 🎉
