/*
  # Update Default Currency to PHP
  
  Updates the default currency in the profiles table to PHP (Philippine Peso)
  
  ## Changes
  - Alter profiles table to set currency default to 'PHP'
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'currency'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN currency SET DEFAULT 'PHP';
  END IF;
END $$;
