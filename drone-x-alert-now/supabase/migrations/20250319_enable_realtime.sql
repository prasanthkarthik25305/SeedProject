-- Enable real-time for emergency_alerts table
-- Run this in your Supabase SQL Editor

-- First, check if realtime is enabled
BEGIN;

-- Enable realtime for emergency_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;

-- Also add policy for admins to UPDATE emergency alerts (needed for resolution)
CREATE POLICY "Admins can update all emergency alerts" ON emergency_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;

-- Verify the publication
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
