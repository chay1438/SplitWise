import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ExpenseWithDetails } from '../../types';
import { RootState } from '../store';

interface ExpenseFilters {
    groupId?: string;
    userId?: string;
    dateRange?: { start: string; end: string };
    category?: string;
}

interface ExpenseState {
    selectedExpense: ExpenseWithDetails | null;
    filters: ExpenseFilters;
}

const initialState: ExpenseState = {
    selectedExpense: null,
    filters: {},
};

const expenseSlice = createSlice({
    name: 'expense',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<ExpenseFilters>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = {};
        },
        setSelectedExpense: (state, action: PayloadAction<ExpenseWithDetails | null>) => {
            state.selectedExpense = action.payload;
        },
    },
});

export const {
    setFilters,
    clearFilters,
    setSelectedExpense,
} = expenseSlice.actions;

export const selectSelectedExpense = (state: RootState) => state.expense.selectedExpense;
export const selectExpenseFilters = (state: RootState) => state.expense.filters;

export default expenseSlice.reducer;
