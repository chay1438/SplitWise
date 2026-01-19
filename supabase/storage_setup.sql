-- 1. Add columns to Tables (if they don't exist)
alter table public.groups 
add column if not exists avatar_url text;

alter table public.expenses 
add column if not exists receipt_url text;

-- 2. Create Storage Buckets
-- Note: 'public' column needs to be true for public access
insert into storage.buckets (id, name, public)
values 
  ('receipts', 'receipts', true),
  ('avatars', 'avatars', true)
on conflict (id) do update 
set public = true; -- Ensure it's public if it exists

-- 3. Storage Policies (Standard "Authenticated users can upload, Everyone can view")

-- RECEIPTS POLICIES
drop policy if exists "Receipts Public View" on storage.objects;
create policy "Receipts Public View"
on storage.objects for select
using ( bucket_id = 'receipts' );

drop policy if exists "Receipts Auth Upload" on storage.objects;
create policy "Receipts Auth Upload"
on storage.objects for insert
with check ( bucket_id = 'receipts' and auth.role() = 'authenticated' );

drop policy if exists "Receipts Owner Update" on storage.objects;
create policy "Receipts Owner Update"
on storage.objects for update
using ( bucket_id = 'receipts' and auth.uid() = owner );

drop policy if exists "Receipts Owner Delete" on storage.objects;
create policy "Receipts Owner Delete"
on storage.objects for delete
using ( bucket_id = 'receipts' and auth.uid() = owner );

-- AVATARS POLICIES
drop policy if exists "Avatars Public View" on storage.objects;
create policy "Avatars Public View"
on storage.objects for select
using ( bucket_id = 'avatars' );

drop policy if exists "Avatars Auth Upload" on storage.objects;
create policy "Avatars Auth Upload"
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

drop policy if exists "Avatars Owner Update" on storage.objects;
create policy "Avatars Owner Update"
on storage.objects for update
using ( bucket_id = 'avatars' and auth.uid() = owner );

drop policy if exists "Avatars Owner Delete" on storage.objects;
create policy "Avatars Owner Delete"
on storage.objects for delete
using ( bucket_id = 'avatars' and auth.uid() = owner );
