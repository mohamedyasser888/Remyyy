-- Award 1 RMS to a post owner for every distinct like their post receives.
-- Rewards are kept when a like is later removed.

-- Some existing databases restrict action names to post_upload/post_like.
-- Temporarily allow the new action while this migration backfills rewards.
ALTER TABLE public.user_points
  DROP CONSTRAINT IF EXISTS user_points_action_check;

ALTER TABLE public.user_points
  ADD CONSTRAINT user_points_action_check
  CHECK (action IN (
    $action$post_upload$action$,
    $action$post_like$action$,
    $action$post_received_like$action$
  ));

ALTER TABLE public.post_likes
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

UPDATE public.post_likes
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.post_likes
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_id_unique
  ON public.post_likes(id);

CREATE OR REPLACE FUNCTION public.award_received_like_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $received_like_reward$
DECLARE
  post_owner_id uuid;
BEGIN
  SELECT user_id INTO post_owner_id
  FROM public.posts
  WHERE id = NEW.post_id;

  IF post_owner_id IS NOT NULL THEN
    INSERT INTO public.user_points (user_id, action, reference_id, points)
    VALUES (post_owner_id, $action$post_received_like$action$, NEW.id, 1)
    ON CONFLICT (user_id, action, reference_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$received_like_reward$;

DROP TRIGGER IF EXISTS post_likes_award_received_points ON public.post_likes;
CREATE TRIGGER post_likes_award_received_points
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.award_received_like_points();

-- Backfill rewards for likes that existed before this migration.
INSERT INTO public.user_points (user_id, action, reference_id, points)
SELECT p.user_id, $action$post_received_like$action$, pl.id, 1
FROM public.post_likes pl
JOIN public.posts p ON p.id = pl.post_id
ON CONFLICT (user_id, action, reference_id) DO NOTHING;

-- Remove the old reward records, which incorrectly rewarded the person
-- clicking Like and used the post ID as a duplicate-prone reference.
DELETE FROM public.user_points
WHERE action = $action$post_like$action$;

-- Keep the action list strict after the old rewards have been removed.
ALTER TABLE public.user_points
  DROP CONSTRAINT IF EXISTS user_points_action_check;

ALTER TABLE public.user_points
  ADD CONSTRAINT user_points_action_check
  CHECK (action IN (
    $action$post_upload$action$,
    $action$post_received_like$action$
  ));

-- Recalculate badges after removing the obsolete liker rewards.
UPDATE public.profiles p
SET remy_badge = public.remy_badge_for_points(
  COALESCE((SELECT SUM(up.points)::integer
            FROM public.user_points up
            WHERE up.user_id = p.id), 0)
);
