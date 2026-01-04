import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Groups', 'Expenses', 'Friends'],
    endpoints: (builder) => ({}),
});
