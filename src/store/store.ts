import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import expenseReducer from './slices/expenseSlice';
import groupReducer from './slices/groupSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';

// Import API injections
import './api/groupsApi';
import './api/expensesApi';
import './api/balanceApi';
import './api/friendsApi';
import './api/settlementsApi';
import './api/activitiesApi';
import './api/notificationsApi';
import './api/authApi';

const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['expense', 'group'], // DON'T persist auth - let it be managed by onAuthStateChange
    // We exclude 'auth' because session tokens should not be persisted
    // Supabase manages its own session storage
};

const rootReducer = combineReducers({
    auth: authReducer,
    ui: uiReducer,
    expense: expenseReducer,
    group: groupReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
                // Ignore these paths in the state
                ignoredPaths: ['auth.session', 'auth.user'],
                warnAfter: 100,
            },
            immutableCheck: { warnAfter: 100 },
        }).concat(apiSlice.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
