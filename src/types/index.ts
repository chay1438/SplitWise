export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

// ==========================================
// 1. Database Types (Matching Supabase Schema)
// ==========================================

export interface Profile {
    id: string; // uuid
    email: string | null;
    full_name: string | null;
    avatar_url?: string | null;
    phone_number?: string | null;
    updated_at?: string | null;
    created_at: string;
}

export interface Group {
    id: string; // uuid
    name: string;
    type: 'Home' | 'Trip' | 'Couple' | 'Other';
    created_by: string; // uuid
    created_at: string;
    updated_at: string;
}

export interface GroupMember {
    id: string; // uuid
    group_id: string; // uuid
    user_id: string; // uuid
    joined_at: string;
}

export interface Friendship {
    id: string; // uuid
    user_id1: string; // uuid
    user_id2: string; // uuid
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
}

export interface Expense {
    id: string; // uuid
    group_id: string | null; // uuid
    payer_id: string; // uuid
    description: string;
    amount: number;
    currency: string;
    date: string; // ISO timestamp
    category: string | null;
    receipt_url?: string | null;
    created_by: string; // uuid
    created_at: string;
    updated_at: string;
}

export interface ExpenseSplit {
    id: string; // uuid
    expense_id: string; // uuid
    user_id: string; // uuid
    amount: number;
}

export interface Settlement {
    id: string; // uuid
    payer_id: string; // uuid
    payee_id: string; // uuid
    group_id: string | null; // uuid
    amount: number;
    currency: string;
    date: string;
    created_at: string;
}

export interface Activity {
    id: string; // uuid
    user_id: string; // uuid
    group_id: string | null; // uuid
    action: string;
    target_id: string | null; // uuid
    details: Json | null;
    created_at: string;
}

export interface Notification {
    id: string; // uuid
    user_id: string; // uuid
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

// ==========================================
// 2. Extended Types (Joined Data)
// ==========================================

export interface GroupWithMembers extends Group {
    members: Profile[];
    member_count?: number;
}

export interface ExpenseSplitWithUser extends ExpenseSplit {
    user: Profile;
}

export interface ExpenseWithDetails extends Expense {
    payer: Profile;
    splits: ExpenseSplitWithUser[];
    group?: Group;
}

// ==========================================
// 3. UI/Form Types
// ==========================================

// Matches existing code usage.
export type SplitType = 'EQUAL' | 'SELECTIVE' | 'INDIVIDUAL';

export interface ExpenseFormData {
    description: string;
    amount: number;
    category: string;
    date: Date;
    groupId?: string;
    friendIds?: string[];
    paidBy: string;
    splitType: SplitType;
    splits: Record<string, number>; // userId -> amount/percentage/shares
    notes?: string;
    receiptUrl?: string;
}

export interface BalanceSummary {
    totalOwed: number;    // Others owe you
    totalOwing: number;   // You owe others
    netBalance: number;   // totalOwed - totalOwing
}

export interface UserBalance {
    userId: string;
    user?: Profile;
    amount: number;  // positive = they owe you, negative = you owe them
    currency?: string;
}

// Legacy Balance type for compatibility with SettleUp logic
export type Balance = {
    id: string;
    group_id: string;
    from_user_id: string;
    to_user_id: string;
    amount: number;
    updated_at: string;
};

export interface FilterState {
    dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
    minAmount: string;
    maxAmount: string;
    status: 'all' | 'settled' | 'unsettled';
    categories: string[];
    friendIds: string[];
    groupIds: string[];
}

// ==========================================
// 4. API Response Types
// ==========================================

export interface ApiResponse<T> {
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    count: number;
    page: number;
    pageSize: number;
}

// ==========================================
// 5. Navigation Types
// ==========================================

export type RootStackParamList = {
    // Auth Stack
    Welcome: undefined;
    Login: { email?: string; successMessage?: string };
    SignUp: undefined;
    UpdatePassword: undefined;

    // Main Stack
    MainTabs: undefined;

    // Nested Screens
    ExpenseDetail: { expense: ExpenseWithDetails };
    GroupDetail: { groupId: string };
    FriendDetail: { friendId: string };
    AddExpense: { groupId?: string; friendId?: string };
    EditExpense: { expenseId: string };
    CreateGroup: undefined;
    EditGroup: { groupId: string };
    SettleUp: { userId?: string; groupId?: string };

    // Legacy / Transitional (Keep if needed until refactor)
    MakeGroup: undefined; // Alias for CreateGroup if needed
    GroupDetails: { groupId: string; groupName: string }; // Alias
    AddGroupMember: { groupId?: string };
};

export type BottomTabParamList = {
    Home: undefined;
    Groups: undefined;
    Friends: undefined;
    Activity: undefined;
    Account: undefined;
    Add: undefined; // Middle button
};
