import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import * as Contacts from 'expo-contacts';

export const contactService = {
    /**
     * Get device contacts and match with registered users by phone AND email
     */
    async findFriendsFromContacts(currentUserId: string): Promise<{
        matched: Profile[];
        unmatched: Contacts.Contact[];
        matchedByPhone: Profile[];
        matchedByEmail: Profile[];
    }> {
        // Step 1: Request permission
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Contacts permission denied');
        }

        // Step 2: Get device contacts with phone AND email
        const { data: deviceContacts } = await Contacts.getContactsAsync({
            fields: [
                Contacts.Fields.Name,
                Contacts.Fields.PhoneNumbers,
                Contacts.Fields.Emails,  // ← Added email field
            ],
        });

        if (!deviceContacts || deviceContacts.length === 0) {
            return { matched: [], unmatched: [], matchedByPhone: [], matchedByEmail: [] };
        }

        // Step 3: Extract phone numbers and emails
        const phoneNumbers: string[] = [];
        const emails: string[] = [];

        deviceContacts.forEach(contact => {
            // Extract phone numbers
            if (contact.phoneNumbers) {
                contact.phoneNumbers.forEach(phone => {
                    if (phone.number) {
                        // Normalize phone number (remove spaces, dashes, etc.)
                        const normalized = phone.number.replace(/[\s\-\(\)]/g, '');
                        phoneNumbers.push(normalized);
                    }
                });
            }

            // Extract emails
            if (contact.emails) {
                contact.emails.forEach(emailObj => {
                    if (emailObj.email) {
                        // Normalize email (lowercase, trim)
                        const normalized = emailObj.email.toLowerCase().trim();
                        emails.push(normalized);
                    }
                });
            }
        });

        // Step 4a: Query database for phone matches
        let matchedByPhone: Profile[] = [];
        if (phoneNumbers.length > 0) {
            const { data: phoneMatches, error: phoneError } = await supabase
                .from('profiles')
                .select('*')
                .in('phone_number', phoneNumbers)
                .neq('id', currentUserId); // Exclude self

            if (phoneError) throw phoneError;
            matchedByPhone = phoneMatches || [];
        }

        // Step 4b: Query database for email matches
        let matchedByEmail: Profile[] = [];
        if (emails.length > 0) {
            const { data: emailMatches, error: emailError } = await supabase
                .from('profiles')
                .select('*')
                .in('email', emails)
                .neq('id', currentUserId); // Exclude self

            if (emailError) throw emailError;
            matchedByEmail = emailMatches || [];
        }

        // Step 5: Combine matches (remove duplicates)
        const matchedUserIds = new Set<string>();
        const matched: Profile[] = [];

        // Add phone matches
        matchedByPhone.forEach(user => {
            if (!matchedUserIds.has(user.id)) {
                matchedUserIds.add(user.id);
                matched.push({ ...user, matchedBy: 'phone' } as any);
            }
        });

        // Add email matches
        matchedByEmail.forEach(user => {
            if (!matchedUserIds.has(user.id)) {
                matchedUserIds.add(user.id);
                matched.push({ ...user, matchedBy: 'email' } as any);
            } else {
                // User matched by both phone and email
                const existing = matched.find(m => m.id === user.id);
                if (existing) {
                    (existing as any).matchedBy = 'both';
                }
            }
        });

        // Step 6: Separate matched and unmatched contacts
        const matchedPhones = matchedByPhone.map(u => u.phone_number || '');
        const matchedEmails = matchedByEmail.map(u => (u.email || '').toLowerCase());

        const unmatched = deviceContacts.filter(contact => {
            // Check if phone is matched
            const hasMatchedPhone = contact.phoneNumbers?.some(phone => {
                if (!phone.number) return false;
                const normalized = phone.number.replace(/[\s\-\(\)]/g, '');
                return matchedPhones.includes(normalized);
            });

            // Check if email is matched
            const hasMatchedEmail = contact.emails?.some(emailObj => {
                if (!emailObj.email) return false;
                const normalized = emailObj.email.toLowerCase().trim();
                return matchedEmails.includes(normalized);
            });

            // Unmatched if neither phone nor email matched
            return !hasMatchedPhone && !hasMatchedEmail;
        });

        return { matched, unmatched, matchedByPhone, matchedByEmail };
    },

    /**
     * Format phone number for display
     */
    formatPhoneNumber(phone: string): string {
        // Remove all non-digits
        const digits = phone.replace(/\D/g, '');

        // Format as (XXX) XXX-XXXX if 10 digits
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        return phone;
    },

    /**
     * Normalize phone number for storage
     */
    normalizePhoneNumber(phone: string): string {
        // Remove all non-digits except leading +
        return phone.replace(/[^\d+]/g, '');
    }
};
