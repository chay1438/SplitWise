export type AppStackParamList = {
    MainTabs: undefined;
    MakeGroup: undefined;
    EditGroup: { groupId: string };
    GroupMembers: { groupId: string };
    GroupDetails: { groupId: string; groupName: string };
    GroupSettings: { groupId: string };
    ExitGroup: { groupId: string };
    DeleteGroup: { groupId: string };
    AddExpense: { groupId?: string; groupName?: string; expenseId?: string };
    GroupAddExpense: { groupId: string; groupName: string };
    EditExpense: { expenseId: string; groupId: string };
    GroupSettleUp: { groupId: string };
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

    AddGroupMember: { groupId?: string };
    AddFriend: undefined;
    EditProfile: undefined;
};

export type BottomTabParamList = {
    Home: undefined;
    Groups: undefined;
    Friends: undefined;
    Activity: undefined;
    Account: undefined;
};
