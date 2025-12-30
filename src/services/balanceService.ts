import { supabase } from '../lib/supabase'
import { Balance } from '../lib/types'

export const balanceService = {
  /**
   * Fetch all balances involving the logged-in user.
   * Used for Home screen: "You owe" & "Owes you"
   */
  async fetchMyBalances() {
    const { data, error } = await supabase
      .from('balances')
      .select('*')

    if (error) throw error

    return data as Balance[]
  },

  /**
   * Fetch balances for a specific group.
   * Used in Group summary screen.
   */
  async fetchGroupBalances(groupId: string) {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('group_id', groupId)

    if (error) throw error

    return data as Balance[]
  },

  /**
   * Calculate net balance for Home screen.
   * Positive = others owe you
   * Negative = you owe others
   */
  async fetchMyNetBalance() {
    const balances = await this.fetchMyBalances()

    let net = 0

    for (const b of balances) {
      if (b.to_user_id === b.id) {
        net += b.amount
      }
      if (b.from_user_id === b.id) {
        net -= b.amount
      }
    }

    return net
  },
}
