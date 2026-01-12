import { Share, Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import uuid from 'react-native-uuid';

// Base URL for deep linking
const APP_SCHEME = 'splitwise://';

export const invitationService = {
    /**
     * 1. Invite a Friend to the App (Generic)
     * Just shares a download link. No database interaction needed.
     */
    async inviteToApp(inviterName: string): Promise<boolean> {
        // In a real app, use a universal link page that redirects to App Store/Play Store
        const downloadUrl = 'https://splitwise.app/download';
        const message = `Join me on SplitWise! Download the app here: ${downloadUrl}`;

        try {
            const result = await Share.share({
                message,
                title: 'Join SplitWise'
            });
            return result.action === Share.sharedAction;
        } catch (error) {
            console.error('Error sharing app invite:', error);
            return false;
        }
    },

    /**
     * 2. Generate a Unique Group Invite Link
     * Creates a token in DB and returns a deep link.
     */
    async createGroupInviteLink(groupId: string): Promise<string | null> {
        try {
            // Use react-native-uuid library
            const token = uuid.v4() as string;

            // Store in Database
            const { error } = await supabase
                .from('group_invitations')
                .insert({
                    group_id: groupId,
                    token: token,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                });

            if (error) {
                console.error('Error creating invite token:', error);
                Alert.alert('Error', 'Could not generate invite link.');
                return null;
            }

            // Construct Deep Link
            // Format: splitwise://join-group?token=abc-123
            return `${APP_SCHEME}join-group?token=${token}`;

        } catch (error) {
            console.error('Error in createGroupInviteLink:', error);
            return null;
        }
    },

    /**
     * 3. Share Group Invite (Legacy Wrapper)
     */
    async shareGroupInvite(groupId: string, groupName: string) {
        const link = await this.createGroupInviteLink(groupId);
        if (!link) return;
        await this.shareGroupLink(link, groupName);
    },

    /**
     * 3b. Share Pre-generated Link (For RTK Query usage)
     */
    async shareGroupLink(link: string, groupName: string) {
        // DEBUG: Log the link so user can see it in terminal
        console.log('-------------------------------------------');
        console.log('GENERATED INVITE LINK:', link);
        console.log('-------------------------------------------');

        const message = `Join my group "${groupName}" on SplitWise! First download the app, then tap this link to join: ${link}`;

        try {
            await Share.share({
                message,
                title: `Join ${groupName}`
            });
        } catch (error) {
            console.error('Error sharing group invite:', error);
        }
    },

    /**
     * 4. Consume Invite (Join Group)
     * Calls the RPC function to validate token and add user.
     */
    async joinGroupViaToken(token: string): Promise<{ success: boolean; message: string; groupId?: string }> {
        try {
            const { data, error } = await supabase.rpc('join_group_via_token', {
                invite_token: token
            });

            if (error) throw error;

            return {
                success: data.success,
                message: data.message,
                groupId: data.group_id
            };
        } catch (error: any) {
            console.error('Error joining group:', error);
            return { success: false, message: error.message || 'Failed to join group' };
        }
    }
};
