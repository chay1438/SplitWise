import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GroupWithMembers } from '../../types';
import { RootState } from '../store';

interface GroupState {
    selectedGroup: GroupWithMembers | null;
}

const initialState: GroupState = {
    selectedGroup: null,
};

const groupSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {
        setSelectedGroup: (state, action: PayloadAction<GroupWithMembers | null>) => {
            state.selectedGroup = action.payload;
        },
        clearSelectedGroup: (state) => {
            state.selectedGroup = null;
        },
    }
});

export const {
    setSelectedGroup,
    clearSelectedGroup,
} = groupSlice.actions;

export const selectSelectedGroup = (state: RootState) => state.group.selectedGroup;

export default groupSlice.reducer;
