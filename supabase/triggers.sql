-- ============================================================
-- Supabase Triggers for SplitWise Automation
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. TRIGGER: Handle New Expense
-- When an expense is created, log an activity for every member of the group.
CREATE OR REPLACE FUNCTION public.handle_new_expense()
RETURNS TRIGGER AS $$
DECLARE
  member RECORD;
  creator_name TEXT;
BEGIN
  -- Get creator's name for richer details
  SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
  
  -- If linked to a group, notify/log for all members
  IF NEW.group_id IS NOT NULL THEN
    FOR member IN SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id
    LOOP
      INSERT INTO public.activities (user_id, group_id, action, target_id, details)
      VALUES (
        member.user_id, 
        NEW.group_id, 
        'expense_created', 
        NEW.id, 
        jsonb_build_object(
            'description', NEW.description, 
            'amount', NEW.amount, 
            'created_by', NEW.created_by,
            'creator_name', COALESCE(creator_name, 'Someone')
        )
      );
    END LOOP;
  ELSE
    -- Individual expense: log only for creator
    INSERT INTO public.activities (user_id, group_id, action, target_id, details)
    VALUES (NEW.created_by, NULL, 'expense_created', NEW.id, jsonb_build_object('description', NEW.description, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_expense_created ON public.expenses;
CREATE TRIGGER on_expense_created
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_expense();


-- 2. TRIGGER: Handle New Group Member
-- When a user is added to a group, send them a Notification and log Activity.
CREATE OR REPLACE FUNCTION public.handle_new_member()
RETURNS TRIGGER AS $$
DECLARE
  group_name TEXT;
BEGIN
  SELECT name INTO group_name FROM public.groups WHERE id = NEW.group_id;
  
  -- Create Notification for the new member
  INSERT INTO public.notifications (user_id, title, message, is_read)
  VALUES (
    NEW.user_id,
    'Added to Group',
    'You have been added to the group "' || COALESCE(group_name, 'Unknown') || '"',
    false
  );

  -- Log Activity for the new member
  INSERT INTO public.activities (user_id, group_id, action, target_id, details)
  VALUES (
    NEW.user_id,
    NEW.group_id,
    'joined_group',
    NEW.group_id,
    jsonb_build_object('group_name', group_name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_member_added ON public.group_members;
CREATE TRIGGER on_member_added
AFTER INSERT ON public.group_members
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_member();


-- 3. TRIGGER: Handle Settlements
-- When a settlement is recorded, notify the Payee and log activity for both.
CREATE OR REPLACE FUNCTION public.handle_new_settlement()
RETURNS TRIGGER AS $$
DECLARE
  payer_name TEXT;
  payee_name TEXT;
BEGIN
  SELECT full_name INTO payer_name FROM public.profiles WHERE id = NEW.payer_id;
  SELECT full_name INTO payee_name FROM public.profiles WHERE id = NEW.payee_id;

  -- Notify Payee
  INSERT INTO public.notifications (user_id, title, message, is_read)
  VALUES (
    NEW.payee_id,
    'Payment Received',
    COALESCE(payer_name, 'Someone') || ' paid you $' || NEW.amount,
    false
  );
  
  -- Log Activity for Payer
  INSERT INTO public.activities (user_id, group_id, action, target_id, details)
  VALUES (
    NEW.payer_id, 
    NEW.group_id, 
    'paid_settlement', 
    NEW.id, 
    jsonb_build_object('amount', NEW.amount, 'payee_name', COALESCE(payee_name, 'Someone'))
  );

  -- Log Activity for Payee
  INSERT INTO public.activities (user_id, group_id, action, target_id, details)
  VALUES (
    NEW.payee_id, 
    NEW.group_id, 
    'received_settlement', 
    NEW.id, 
    jsonb_build_object('amount', NEW.amount, 'payer_name', COALESCE(payer_name, 'Someone'))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_settlement_created ON public.settlements;
CREATE TRIGGER on_settlement_created
AFTER INSERT ON public.settlements
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_settlement();
