import { Share, Linking } from 'react-native';
import * as SMS from 'expo-sms';
import * as MailComposer from 'expo-mail-composer';
import { supabase } from '../lib/supabase';

export const invitationService = {
    /**
     * Generate a shareable invitation link
     */
    generateInviteLink(inviterName: string, inviterId: string): string {
        // Deep link to your app with referral code
        const baseUrl = 'https://splitwise.app'; // Your website/landing page
        const referralCode = Buffer.from(inviterId).toString('base64').substring(0, 10);

        return `${baseUrl}/invite/${referralCode}?from=${encodeURIComponent(inviterName)}`;
    },

    /**
     * Share invite via system share sheet (WhatsApp, SMS, Email, etc.)
     */
    async shareInvite(inviterName: string, inviterId: string, friendName?: string) {
        const inviteLink = this.generateInviteLink(inviterName, inviterId);
        const message = friendName
            ? `Hey ${friendName}! ${inviterName} invited you to join SplitWise to split expenses easily. Download now: ${inviteLink}`
            : `${inviterName} invited you to join SplitWise to split expenses easily. Download now: ${inviteLink}`;

        try {
            const result = await Share.share({
                message: message,
                title: 'Join me on SplitWise',
            });

            if (result.action === Share.sharedAction) {
                // User shared
                return { success: true, method: 'share' };
            } else {
                // User dismissed
                return { success: false, method: 'dismissed' };
            }
        } catch (error) {
            throw new Error('Failed to share invitation');
        }
    },

    /**
     * Send invite via SMS (if phone number available)
     */
    async sendSMSInvite(
        phoneNumber: string,
        inviterName: string,
        inviterId: string,
        friendName?: string
    ) {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
            throw new Error('SMS not available on this device');
        }

        const inviteLink = this.generateInviteLink(inviterName, inviterId);
        const message = friendName
            ? `Hey ${friendName}! ${inviterName} invited you to SplitWise. Join now: ${inviteLink}`
            : `${inviterName} invited you to SplitWise. Join now: ${inviteLink}`;

        const { result } = await SMS.sendSMSAsync(phoneNumber, message);
        return { success: result === 'sent', method: 'sms' };
    },

    /**
     * Send invite via Email (if email available)
     */
    async sendEmailInvite(
        email: string,
        inviterName: string,
        inviterId: string,
        friendName?: string
    ) {
        const isAvailable = await MailComposer.isAvailableAsync();
        if (!isAvailable) {
            throw new Error('Email not available on this device');
        }

        const inviteLink = this.generateInviteLink(inviterName, inviterId);
        const subject = `${inviterName} invited you to SplitWise`;
        const body = `
Hi ${friendName || 'there'}!

${inviterName} invited you to join SplitWise - the best way to split expenses with friends and roommates.

Join now and start tracking shared expenses easily:
${inviteLink}

See you on SplitWise!
        `;

        const result = await MailComposer.composeAsync({
            recipients: [email],
            subject: subject,
            body: body,
        });

        return { success: result.status === 'sent', method: 'email' };
    },

    /**
     * Track invitation in database (optional - for analytics)
     */
    async trackInvitation(inviterId: string, method: string, recipientInfo?: string) {
        const { error } = await supabase
            .from('invitations')
            .insert({
                inviter_id: inviterId,
                method: method,
                recipient_info: recipientInfo, // Phone or email (hashed for privacy)
                status: 'sent',
                created_at: new Date().toISOString()
            });

        if (error) console.error('Failed to track invitation:', error);
    },

    /**
     * Open app store for sharing
     */
    async shareAppStoreLink() {
        const appStoreUrl = 'https://apps.apple.com/app/splitwise'; // Your iOS app
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.splitwise'; // Your Android app

        // Detect platform and use appropriate link
        const storeUrl = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;

        await Share.share({
            message: `Check out SplitWise - the best way to split expenses! ${storeUrl}`,
            title: 'Join me on SplitWise'
        });
    }
};
