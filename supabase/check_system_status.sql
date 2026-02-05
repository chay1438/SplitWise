-- ============================================================
-- 🛠️ SYSTEM STATUS CHECK SCRIPT
-- Run this in your Supabase SQL Editor to verify your setup.
-- ============================================================

DO $$
DECLARE
    col_check RECORD;
    trig_check RECORD;
    table_check RECORD;
BEGIN
    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE '🔍 CHECKING DATABASE MIGRATIONS STATUS';
    RAISE NOTICE '--------------------------------------------';

    -- 1. Check for Payment Method & Notes columns
    SELECT INTO col_check count(*) as count
    FROM information_schema.columns 
    WHERE table_name = 'settlements' AND column_name IN ('payment_method', 'notes');

    IF col_check.count = 2 THEN
        RAISE NOTICE '✅ [Settle Up] Settlements table has updated columns.';
    ELSE
        RAISE NOTICE '❌ [Settle Up] MISSING columns in settlements table. Run add_settlement_details.sql';
    END IF;

    -- 2. Check for Triggers (Activity Feed)
    SELECT INTO trig_check count(*) as count
    FROM information_schema.triggers 
    WHERE trigger_name IN ('on_expense_created', 'on_member_added', 'on_settlement_created');

    IF trig_check.count = 3 THEN
        RAISE NOTICE '✅ [Activity] All 3 automation triggers are ACTIVE.';
    ELSE
        RAISE NOTICE '❌ [Activity] Missing triggers (Found %/3). Run triggers.sql', trig_check.count;
    END IF;

    -- 3. Check for Data
    SELECT INTO table_check (SELECT count(*) FROM public.activities) as acts, (SELECT count(*) FROM public.settlements) as sets;
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total Activities Logged: %', table_check.acts;
    RAISE NOTICE '   - Total Settlements: %', table_check.sets;

    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE '✅ CHECK COMPLETE';
    RAISE NOTICE '--------------------------------------------';
END $$;
