-- Add admin_mode column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_mode BOOLEAN DEFAULT false;
