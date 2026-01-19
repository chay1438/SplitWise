import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';

import { Notification } from '../../types';
import { notificationService } from '../../services/notificationService';

export const notificationsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNotifications: builder.query<Notification[], string>({
            queryFn: async (userId) => {
                try {
                    const data = await notificationService.getNotifications(userId);
                    return { data };
                } catch (e: any) {
                    return { error: e.message };
                }
            },
            providesTags: ['Notifications']
        }),
        markAsRead: builder.mutation<null, string>({
            queryFn: async (notificationId) => {
                try {
                    await notificationService.markAsRead(notificationId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Notifications']
        }),
        markAllAsRead: builder.mutation<null, string>({
            queryFn: async (userId) => {
                try {
                    await notificationService.markAllAsRead(userId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Notifications']
        }),
        deleteNotification: builder.mutation<null, string>({
            queryFn: async (notificationId) => {
                try {
                    await notificationService.deleteNotification(notificationId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Notifications']
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    useDeleteNotificationMutation
} = notificationsApiSlice;
