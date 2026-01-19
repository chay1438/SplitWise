-- Rewriting group_balances_view to use UNION ALL
-- This avoids the "FULL JOIN is only supported with merge-joinable..." error
-- and is much more performant.

create or replace view group_balances_view as
with all_transactions as (
    -- 1. Expenses Paid (You paid for others -> + Credit)
    select 
        group_id, 
        payer_id as user_id, 
        amount as net_amount
    from expenses
    where group_id is not null

    union all

    -- 2. Expense Splits (You owe for a share -> - Debit)
    select 
        e.group_id, 
        s.user_id, 
        -s.amount as net_amount
    from expense_splits s
    join expenses e on s.expense_id = e.id
    where e.group_id is not null

    union all

    -- 3. Settlements Paid (You paid debt -> + Credit to your standing)
    -- If I owed $50 (-50) and I pay $50, my balance becomes 0.
    -- So paying money adds positive value to your negative balance.
    select 
        group_id, 
        payer_id as user_id, 
        amount as net_amount
    from settlements
    where group_id is not null

    union all

    -- 4. Settlements Received (You got money -> - Debit to your standing)
    -- If someone owed me $50 (+50) and they pay me $50, my balance becomes 0.
    -- So receiving money subtracts from your positive balance.
    select 
        group_id, 
        payee_id as user_id, 
        -amount as net_amount
    from settlements
    where group_id is not null
)
select 
    group_id,
    user_id,
    sum(net_amount) as net_balance
from all_transactions
group by group_id, user_id
having sum(net_amount) != 0; -- Optional: Hide perfectly settled 0 balances
