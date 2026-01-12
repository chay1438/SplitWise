-- Clean up existing schema (This will DELETE ALL DATA in these tables)
drop table if exists public.notifications cascade;
drop table if exists public.activities cascade;
drop table if exists public.settlements cascade;
drop table if exists public.expense_splits cascade;
drop table if exists public.expenses cascade;
drop table if exists public.friendships cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.profiles cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. GROUPS
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('Home', 'Trip', 'Couple', 'Other')) default 'Other',
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. GROUP MEMBERS
create table public.group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, user_id)
);

-- 4. FRIENDSHIPS
create table public.friendships (
  id uuid default uuid_generate_v4() primary key,
  user_id1 uuid references public.profiles(id) not null,
  user_id2 uuid references public.profiles(id) not null,
  status text check (status in ('pending', 'accepted', 'blocked')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (user_id1 < user_id2), -- Prevent duplicate pairs (A,B) and (B,A)
  unique(user_id1, user_id2)
);

-- 5. EXPENSES
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete set null,
  payer_id uuid references public.profiles(id) not null,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text default 'USD',
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  category text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. EXPENSE SPLITS
create table public.expense_splits (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  amount numeric(10,2) not null check (amount >= 0),
  unique(expense_id, user_id)
);

-- 7. SETTLEMENTS (Payments)
create table public.settlements (
  id uuid default uuid_generate_v4() primary key,
  payer_id uuid references public.profiles(id) not null,
  payee_id uuid references public.profiles(id) not null,
  group_id uuid references public.groups(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  currency text default 'USD',
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ACTIVITIES
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  group_id uuid references public.groups(id),
  action text not null, -- 'created_expense', 'joined_group', etc
  target_id uuid, -- Reference to expense_id, group_id etc (loose reference)
  details jsonb, -- Store extra data like expense amount, name etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. NOTIFICATIONS
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INDEXES
create index idx_expenses_group_id on public.expenses(group_id);
create index idx_expenses_payer_id on public.expenses(payer_id);
create index idx_expense_splits_expense_id on public.expense_splits(expense_id);
create index idx_expense_splits_user_id on public.expense_splits(user_id);
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_friendships_user_id1 on public.friendships(user_id1);
create index idx_friendships_user_id2 on public.friendships(user_id2);

-- ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.friendships enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

create policy "View groups if member" on public.groups for select using (
  exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "Create groups" on public.groups for insert with check (auth.uid() = created_by);
create policy "Update groups if member" on public.groups for update using (
  exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid())
);

-- Helper to avoid recursion
create or replace function public.is_member_of(_group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members
    where group_id = _group_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create policy "View members" on public.group_members for select using (
  is_member_of(group_id)
);
create policy "Join group" on public.group_members for insert with check (true);

create policy "View expenses if in group" on public.expenses for select using (
  (group_id is not null and exists (select 1 from public.group_members where group_id = expenses.group_id and user_id = auth.uid()))
  or
  (payer_id = auth.uid())
);
create policy "Create expenses" on public.expenses for insert with check (auth.uid() = created_by);

create policy "View splits" on public.expense_splits for select using (
  exists (
    select 1 from public.expenses e
    left join public.group_members gm on e.group_id = gm.group_id
    where e.id = expense_splits.expense_id and (gm.user_id = auth.uid() or e.payer_id = auth.uid())
  )
);
create policy "Create splits" on public.expense_splits for insert with check (
   exists (select 1 from public.expenses where id = expense_id and created_by = auth.uid())
);

-- TRIGGERS for updated_at
create or replace function public.handle_updated_at() 
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger on_groups_updated before update on public.groups for each row execute procedure public.handle_updated_at();
create trigger on_expenses_updated before update on public.expenses for each row execute procedure public.handle_updated_at();

-- AUTO PROFILE CREATION TRIGGER
-- Drop the trigger if it exists to avoid conflicts
drop trigger if exists on_auth_user_created on auth.users;
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- VIEWS & FUNCTIONS
drop view if exists group_balances_view;

create or replace view group_balances_view as
with expense_credits as (
    select group_id, payer_id as user_id, sum(amount) as amount_paid
    from expenses
    where group_id is not null
    group by group_id, payer_id
),
expense_debits as (
    select e.group_id, s.user_id, sum(s.amount) as amount_owed
    from expense_splits s
    join expenses e on s.expense_id = e.id
    where e.group_id is not null
    group by e.group_id, s.user_id
),
settlement_credits as (
    select group_id, payer_id as user_id, sum(amount) as amount_paid
    from settlements
    where group_id is not null
    group by group_id, payer_id
),
settlement_debits as (
    select group_id, payee_id as user_id, sum(amount) as amount_received
    from settlements
    where group_id is not null
    group by group_id, payee_id
)
select 
    coalesce(ec.group_id, ed.group_id) as group_id,
    coalesce(ec.user_id, ed.user_id) as user_id,
    (
        coalesce(ec.amount_paid, 0) + coalesce(sc.amount_paid, 0)
    ) - (
        coalesce(ed.amount_owed, 0) + coalesce(sd.amount_received, 0)
    ) as net_balance
from expense_credits ec
full outer join expense_debits ed on ec.group_id = ed.group_id and ec.user_id = ed.user_id
full outer join settlement_credits sc on (ec.group_id = sc.group_id or ed.group_id = sc.group_id) and (ec.user_id = sc.user_id or ed.user_id = sc.user_id)
full outer join settlement_debits sd on (ec.group_id = sd.group_id or ed.group_id = sd.group_id) and (ec.user_id = sd.user_id or ed.user_id = sd.user_id);


create or replace function get_user_total_balance(query_user_id uuid)
returns numeric as $$
declare
    total_bal numeric;
begin
    select sum(net_balance) into total_bal
    from group_balances_view
    where user_id = query_user_id;
    
    return coalesce(total_bal, 0);
end;
$$ language plpgsql;
