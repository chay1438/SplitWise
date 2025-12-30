export type Profile = {
    id: string; // uuid
    name: string;
    email: string;
    created_at: string;
};

export type Group = {
    id: string; // uuid
    name: string;
    created_by: string; // uuid
    created_at: string;
};

export type GroupMember = {
    id: string; // uuid
    group_id: string; // uuid
    user_id: string; // uuid
    role: 'admin' | 'member'; // Assuming 'admin' or 'member' based on SQL
    joined_at: string;
};

export type SplitType = 'EQUAL' | 'SELECTIVE' | 'INDIVIDUAL'; 

export type Expense = {
    id: string; // uuid
    group_id: string; // uuid
    created_by: string; // uuid
    amount: number;
    split_type: SplitType;
    description: string;
    created_at: string;
};

export type ExpenseSplit = {
    id: string; // uuid
    expense_id: string; // uuid
    user_id: string; // uuid
    share_amount: number;
};

export type Balance = {
    id: string; // uuid
    group_id: string; // uuid
    from_user_id: string; // uuid
    to_user_id: string; // uuid
    amount: number;
    updated_at: string;
};
