-- Sizes are free text. Belts, accessories, and bags may omit size entirely.
DO $$
DECLARE
  table_name text;
  constraint_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['wardrobe_items', 'posts'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = table_name
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%size%'
      LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);
      END LOOP;
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN size DROP NOT NULL', table_name);
    END IF;
  END LOOP;

  IF to_regclass('public.partner_posts') IS NOT NULL THEN
    ALTER TABLE public.partner_posts ADD COLUMN IF NOT EXISTS size text;
    ALTER TABLE public.partner_posts ALTER COLUMN size DROP NOT NULL;
  END IF;

  IF to_regclass('public.trends') IS NOT NULL THEN
    ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS size text;
  END IF;
END $$;
