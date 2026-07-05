-- Extended nutrition fields per Recipe Keeper style
-- Run this in Supabase Dashboard: SQL Editor -> New query -> paste -> Run

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS total_fat numeric CHECK (total_fat >= 0),
  ADD COLUMN IF NOT EXISTS saturated_fat numeric CHECK (saturated_fat >= 0),
  ADD COLUMN IF NOT EXISTS cholesterol numeric CHECK (cholesterol >= 0),
  ADD COLUMN IF NOT EXISTS sodium numeric CHECK (sodium >= 0),
  ADD COLUMN IF NOT EXISTS total_carbohydrate numeric CHECK (total_carbohydrate >= 0),
  ADD COLUMN IF NOT EXISTS dietary_fiber numeric CHECK (dietary_fiber >= 0),
  ADD COLUMN IF NOT EXISTS sugars numeric CHECK (sugars >= 0),
  ADD COLUMN IF NOT EXISTS serving_size text;
