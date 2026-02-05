-- Migration to add payment method and notes to settlements table

ALTER TABLE public.settlements 
ADD COLUMN IF NOT EXISTS payment_method text check (payment_method in ('Cash', 'UPI', 'PayPal', 'Other')) default 'Cash',
ADD COLUMN IF NOT EXISTS notes text;

-- Update the schema documentation if needed
COMMENT ON COLUMN public.settlements.payment_method IS 'Method used for payment (Cash, UPI, etc)';
COMMENT ON COLUMN public.settlements.notes IS 'Optional notes or transaction ID';
