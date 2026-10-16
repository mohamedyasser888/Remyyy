-- Secure admin message access through the Supabase Auth admin account.
-- Create this user in Supabase Auth with email: remyadmin@remy.app.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can view all messages' AND tablename = 'messages') THEN
    CREATE POLICY "Admin can view all messages" ON public.messages FOR SELECT TO authenticated
      USING (lower(auth.jwt()->>'email') = 'remyadmin@remy.app');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can send messages' AND tablename = 'messages') THEN
    CREATE POLICY "Admin can send messages" ON public.messages FOR INSERT TO authenticated
      WITH CHECK (lower(auth.jwt()->>'email') = 'remyadmin@remy.app' AND sender = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can update messages' AND tablename = 'messages') THEN
    CREATE POLICY "Admin can update messages" ON public.messages FOR UPDATE TO authenticated
      USING (lower(auth.jwt()->>'email') = 'remyadmin@remy.app');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mark_messages_read(target_user_id uuid)
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  IF lower(auth.jwt()->>'email') <> 'remyadmin@remy.app' THEN
    RAISE EXCEPTION 'Only the admin account can mark admin messages as read';
  END IF;
  UPDATE public.messages SET admin_read_at = now()
  WHERE user_id = target_user_id AND sender = 'user' AND deleted_by_admin = false
    AND (admin_read_at IS NULL OR admin_read_at < created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_user_messages_read(target_user_id uuid)
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id
     AND lower(auth.jwt()->>'email') <> 'remyadmin@remy.app' THEN
    RAISE EXCEPTION 'You can only mark your own messages as read';
  END IF;
  UPDATE public.messages SET user_read_at = now()
  WHERE user_id = target_user_id AND sender = 'admin' AND deleted_by_user = false
    AND (user_read_at IS NULL OR user_read_at < created_at);
END;
$$;
