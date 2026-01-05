import { supabase } from '../lib/supabase';
import { Settlement } from '../types';

export const settlementService = {
    async getSettlements(userId?: string, groupId?: string): Promise<Settlement[]> {
        let query = supabase
            .from('settlements')
            .select('*')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.or(`payer_id.eq.${userId},payee_id.eq.${userId}`);
        }
        if (groupId) {
            query = query.eq('group_id', groupId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Settlement[];
    },

    async createSettlement(data: {
        payerId: string;
        payeeId: string;
        amount: number;
        groupId?: string;
        date: string;
    }): Promise<Settlement> {
        const { data: settlement, error } = await supabase
            .from('settlements')
            .insert({
                payer_id: data.payerId,
                payee_id: data.payeeId,
                group_id: data.groupId,
                amount: data.amount,
                date: data.date,
                currency: 'USD'
            })
            .select()
            .single();

        if (error) throw error;
        return settlement;
    }
};
