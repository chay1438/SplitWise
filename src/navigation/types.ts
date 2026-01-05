export type AppStackParamList = {
    MainTabs: undefined;
    MakeGroup: undefined;
    EditGroup: { groupId: string };
    GroupDetails: { groupId: string; groupName: string };
    AddExpense: { groupId: string; groupName: string };
    EditExpense: { expenseId: string; groupId: string };
    SettleUp: { userId?: string; groupId?: string } | undefined;
    ExpenseDetail: { expense: any };
    FriendDetail: { friendId: string };
    Notifications: undefined;
    Search: undefined;
    ReceiptViewer: {
        imageUrl: string;
        expenseId: string;
        description: string;
        date: string;
        amount: number;
    };
    Filter: { currentFilters?: any };
    CategorySelector: { onSelect: (category: string) => void };
    AddGroupMember: { groupId?: string };
};

export type BottomTabParamList = {
    Home: undefined;
    Groups: undefined;
    Friends: undefined;
    Activity: undefined;
    Account: undefined;
};
