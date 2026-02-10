-- Run this in your Supabase SQL Editor to setup the database

-- 1. Create the table
CREATE TABLE daily_reports (
  date text PRIMARY KEY,
  items jsonb,
  inspector_name text,
  completion_time text,
  actions_taken text,
  finalized boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows anyone to read/write (since this is an internal tool)
-- Note: For higher security, you would implement authentication, but this enables the app to work immediately.
CREATE POLICY "Enable all access for all users" 
ON daily_reports 
FOR ALL 
USING (true) 
WITH CHECK (true);