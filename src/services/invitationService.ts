import { Share } from 'react-native';

export const invitationService = {
    /**
     * Share invite via built-in share sheet
     */
    async shareInvite(inviterName: string, friendName?: string): Promise<boolean> {
        const appUrl = 'https://splitwise.app/download';

        const message = friendName
            ? `Hey ${friendName}! ${inviterName} invited you to SplitWise. Download: ${appUrl}`
            : `${inviterName} invited you to SplitWise. Download: ${appUrl}`;

        try {
            const result = await Share.share({
                message,
                title: 'Join SplitWise'
            });

            return result.action === Share.sharedAction;
        } catch (error) {
            console.error('Error sharing:', error);
            return false;
        }
    }
};
