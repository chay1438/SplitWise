import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

// Root API slice
// We define the base configuration here, but no endpoints.
// Feature-specific endpoints will be injected in their own files using `injectEndpoints`.
export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Groups', 'Expenses', 'Balances', 'Profile', 'Friends', 'Activities', 'Notifications'],
    refetchOnMountOrArgChange: true, // Ensure fresh data on every screen mount
    endpoints: () => ({}), // Start empty
});
