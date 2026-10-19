-- Favourites + manual sort order
-- Run this in Supabase Dashboard: SQL Editor -> New query -> paste -> Run

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer;

-- Seed sort_order from created_at so existing recipes keep their current order.
-- Newest-first (matches the app's default listing) => lower sort_order first.
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY owner_id ORDER BY created_at DESC) AS rn
  FROM public.recipes
  WHERE sort_order IS NULL
)
UPDATE public.recipes r
SET sort_order = o.rn
FROM ordered o
WHERE r.id = o.id;

CREATE INDEX IF NOT EXISTS recipes_owner_sort_idx
  ON public.recipes (owner_id, sort_order);
