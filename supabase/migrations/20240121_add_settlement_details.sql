-- Add missing columns to settlements table
alter table public.settlements 
add column if not exists payment_method text check (payment_method in ('Cash', 'UPI', 'PayPal', 'Other')) default 'Cash',
add column if not exists notes text;
