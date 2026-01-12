import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationState {
    id: string; // Unique ID to force re-renders if same message repeats
    message: string;
    type: NotificationType;
}

interface UiState {
    isLoading: boolean;
    loadingMessage: string | null;
    error: string | null;
    notification: NotificationState | null;
    activeModal: string | null;
    modalData: any;
}

const initialState: UiState = {
    isLoading: false,
    loadingMessage: null,
    error: null,
    notification: null,
    activeModal: null,
    modalData: null,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
            state.isLoading = action.payload.isLoading;
            state.loadingMessage = action.payload.message || null;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        showNotification: (state, action: PayloadAction<{ message: string; type: NotificationType }>) => {
            state.notification = {
                id: Date.now().toString(),
                message: action.payload.message,
                type: action.payload.type,
            };
        },
        hideNotification: (state) => {
            state.notification = null;
        },
        openModal: (state, action: PayloadAction<{ modal: string; data?: any }>) => {
            state.activeModal = action.payload.modal;
            state.modalData = action.payload.data || null;
        },
        closeModal: (state) => {
            state.activeModal = null;
            state.modalData = null;
        },
    },
});

export const {
    setLoading,
    setError,
    clearError,
    showNotification,
    hideNotification,
    openModal,
    closeModal,
} = uiSlice.actions;

export const selectUiLoading = (state: RootState) => state.ui.isLoading;
export const selectUiError = (state: RootState) => state.ui.error;
export const selectNotification = (state: RootState) => state.ui.notification;
export const selectActiveModal = (state: RootState) => state.ui.activeModal;
export const selectModalData = (state: RootState) => state.ui.modalData;

export default uiSlice.reducer;
