-- Enable Realtime for core tables
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_splits;
alter publication supabase_realtime add table public.settlements;

-- Enable Realtime for group management
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;

-- Enable Realtime for feed and notifications
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.notifications;
